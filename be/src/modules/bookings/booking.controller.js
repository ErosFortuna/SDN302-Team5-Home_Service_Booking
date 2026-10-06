import mongoose from "mongoose";
import Booking from "./booking.model.js";
import "../services/service.model.js"; // registers `Service` for populate()
import { AppError } from "../../shared/app-error.js";
import {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  MATERIAL_APPROVAL,
  assertProviderTransition,
  getAllowedProviderTransitions,
  sumMaterials,
} from "./booking.status.js";

const MAX_MATERIALS_PER_BOOKING = 50;

const BOOKING_POPULATE = [
  { path: "customer", select: "fullName phone email avatarUrl" },
  { path: "service", select: "name slug basePrice estimatedDurationMinutes" },
];

const STATUS_MESSAGES = {
  [BOOKING_STATUS.PROVIDER_ON_THE_WAY]: "Provider is on the way",
  [BOOKING_STATUS.ARRIVED]: "Provider has arrived",
  [BOOKING_STATUS.IN_PROGRESS]: "Service started",
  [BOOKING_STATUS.AWAITING_APPROVAL]: "Extra costs sent to customer for approval",
  [BOOKING_STATUS.COMPLETED]: "Service completed",
};

/** Response shape shared by every endpoint; includes the next legal actions for the UI. */
const toResponse = (booking) => ({
  ...booking.toJSON(),
  allowedTransitions: getAllowedProviderTransitions(booking.status),
});

const conflict = () =>
  new AppError(409, "Booking was modified by another request. Please reload and try again.");

// ─── Queries ──────────────────────────────────────────────────────────────────

/** GET /api/bookings/provider/me?status=IN_PROGRESS */
export async function getMyProviderBookings(req, res) {
  const filter = { provider: req.user._id };
  const { status } = req.query;

  if (status) {
    const statuses = String(status).split(",");
    if (!statuses.every((s) => BOOKING_STATUS_VALUES.includes(s))) {
      throw new AppError(400, "Invalid status filter");
    }
    filter.status = { $in: statuses };
  }

  const bookings = await Booking.find(filter)
    .sort({ scheduledStartAt: 1 })
    .limit(100)
    .populate(BOOKING_POPULATE);

  res.json({ success: true, data: bookings.map(toResponse) });
}

/** GET /api/bookings/:id */
export async function getBookingById(req, res) {
  await req.booking.populate(BOOKING_POPULATE);
  res.json({ success: true, data: toResponse(req.booking) });
}

// ─── UC-38: Update Service Status ─────────────────────────────────────────────

/** PATCH /api/bookings/:id/status   body: { status, note?, confirmCompletion? } */
export async function updateServiceStatus(req, res) {
  const { booking, user } = req;
  const { status: nextStatus, note, confirmCompletion } = req.body;
  const from = booking.status;

  assertProviderTransition(booking, nextStatus, { confirmCompletion });

  const now = new Date();
  const $set = { status: nextStatus };
  if (nextStatus === BOOKING_STATUS.IN_PROGRESS && !booking.startedAt) $set.startedAt = now;
  if (nextStatus === BOOKING_STATUS.COMPLETED) {
    $set.completedAt = now;
    if (note) $set.completionNote = note;
  }

  // Atomic compare-and-set on the current status prevents double submits / race conditions.
  const guard = { _id: booking._id, provider: user._id, status: from };
  if (nextStatus === BOOKING_STATUS.COMPLETED) {
    guard["materials.approvalStatus"] = { $ne: MATERIAL_APPROVAL.PENDING };
  }

  const updated = await Booking.findOneAndUpdate(
    guard,
    {
      $set,
      $push: { statusHistory: { from, to: nextStatus, changedBy: user._id, note, changedAt: now } },
    },
    { new: true, runValidators: true },
  ).populate(BOOKING_POPULATE);

  if (!updated) throw conflict();

  res.json({ success: true, message: STATUS_MESSAGES[nextStatus], data: toResponse(updated) });
}

/** POST /api/bookings/:id/materials   body: { items: [{ name, quantity, price, note? }] } */
export async function addMaterialAndFee(req, res) {
  const { booking, user } = req;
  const { items } = req.body;

  if (booking.status !== BOOKING_STATUS.IN_PROGRESS) {
    throw new AppError(422, `Materials can only be added while IN_PROGRESS (current: ${booking.status})`);
  }
  if (booking.materials.length + items.length > MAX_MATERIALS_PER_BOOKING) {
    throw new AppError(422, `A booking can have at most ${MAX_MATERIALS_PER_BOOKING} material/fee items`);
  }

  const docs = items.map((item) => ({
    ...item,
    approvalStatus: MATERIAL_APPROVAL.PENDING,
    addedBy: user._id,
  }));

  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, provider: user._id, status: BOOKING_STATUS.IN_PROGRESS },
    { $push: { materials: { $each: docs } } },
    { new: true, runValidators: true },
  ).populate(BOOKING_POPULATE);

  if (!updated) throw conflict();

  res.status(201).json({
    success: true,
    message: `${docs.length} item(s) added and pending customer approval`,
    data: toResponse(updated),
  });
}

/** DELETE /api/bookings/:id/materials/:materialId  (only PENDING items while IN_PROGRESS) */
export async function removeMaterial(req, res) {
  const { booking, user } = req;
  const { materialId } = req.params;

  if (!mongoose.isValidObjectId(materialId)) throw new AppError(400, "Invalid material id");

  const updated = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      provider: user._id,
      status: BOOKING_STATUS.IN_PROGRESS,
      materials: { $elemMatch: { _id: materialId, approvalStatus: MATERIAL_APPROVAL.PENDING } },
    },
    { $pull: { materials: { _id: materialId } } },
    { new: true },
  ).populate(BOOKING_POPULATE);

  if (!updated) {
    throw new AppError(422, "Item not found, already decided, or booking is not IN_PROGRESS");
  }

  res.json({ success: true, message: "Item removed", data: toResponse(updated) });
}

/**
 * PATCH /api/bookings/:id/materials/decision   body: { decision: "APPROVED" | "REJECTED" }
 * Customer approves/rejects all PENDING items → booking returns to IN_PROGRESS.
 */
export async function decideMaterials(req, res) {
  const { booking, user } = req;
  const { decision } = req.body;

  if (booking.status !== BOOKING_STATUS.AWAITING_APPROVAL) {
    throw new AppError(422, `Nothing to approve (current status: ${booking.status})`);
  }

  const now = new Date();
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, customer: user._id, status: BOOKING_STATUS.AWAITING_APPROVAL },
    {
      $set: {
        status: BOOKING_STATUS.IN_PROGRESS,
        "materials.$[m].approvalStatus": decision,
        "materials.$[m].decidedAt": now,
      },
      $push: {
        statusHistory: {
          from: BOOKING_STATUS.AWAITING_APPROVAL,
          to: BOOKING_STATUS.IN_PROGRESS,
          changedBy: user._id,
          note: `Customer ${decision.toLowerCase()} extra costs`,
          changedAt: now,
        },
      },
    },
    { new: true, arrayFilters: [{ "m.approvalStatus": MATERIAL_APPROVAL.PENDING }] },
  );

  if (!updated) throw conflict();

  // Keep the cached approved total in sync.
  updated.additionalFees = sumMaterials(updated.materials, MATERIAL_APPROVAL.APPROVED);
  await Booking.updateOne({ _id: updated._id }, { $set: { additionalFees: updated.additionalFees } });
  await updated.populate(BOOKING_POPULATE);

  res.json({ success: true, message: `Extra costs ${decision.toLowerCase()}`, data: toResponse(updated) });
}
