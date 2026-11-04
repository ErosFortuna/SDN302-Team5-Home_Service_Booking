const mongoose = require("mongoose");
const Booking = require("./booking.model.js");
const User = require("../users/user.model.js");
const ProviderProfile = require("../providers/provider.model.js");
const ServiceRequest = require("../requests/request.model.js");
const { createNotification } = require("../notifications/notification.service.js");
require("../services/service.model.js"); // registers `Service` for populate()
const { AppError } = require("../../shared/app-error.js");
const {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  DECLINE_REASON,
  BOOKING_RESPONSE_TIMEOUT_HOURS,
  MATERIAL_APPROVAL,
  assertProviderTransition,
  getAllowedProviderTransitions,
  sumMaterials,
} = require("./booking.status.js");

const MAX_MATERIALS_PER_BOOKING = 50;

const BOOKING_POPULATE = [
  { path: "customer", select: "fullName phone email avatarUrl" },
  { path: "provider", select: "fullName phone email avatarUrl" },
  { path: "service", select: "name slug basePrice estimatedDurationMinutes" },
  { path: "request", select: "description address preferredStartAt preferredEndAt status attachments" },
];

const STATUS_MESSAGES = {
  [BOOKING_STATUS.CONFIRMED]: "Booking confirmed",
  [BOOKING_STATUS.PROVIDER_ON_THE_WAY]: "Provider is on the way",
  [BOOKING_STATUS.ARRIVED]: "Provider has arrived",
  [BOOKING_STATUS.IN_PROGRESS]: "Service started",
  [BOOKING_STATUS.AWAITING_APPROVAL]: "Extra costs sent to customer for approval",
  [BOOKING_STATUS.COMPLETED]: "Service completed",
  [BOOKING_STATUS.CANCELLED]: "Booking cancelled",
};

const DECLINE_LABELS = {
  [DECLINE_REASON.BUSY]: "Thợ bận vào thời gian này",
  [DECLINE_REASON.TOO_FAR]: "Khoảng cách quá xa khu vực phục vụ",
  [DECLINE_REASON.OUT_OF_SKILL]: "Không phù hợp với chuyên môn kỹ thuật",
  [DECLINE_REASON.PRICE_ISSUE]: "Không thỏa thuận được chi phí / phát sinh",
  [DECLINE_REASON.OTHER]: "Lý do khác",
  [DECLINE_REASON.NO_RESPONSE]: "Hết thời hạn phản hồi từ thợ",
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
async function getMyProviderBookings(req, res) {
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

/** GET /api/bookings/customer/me?status=CONFIRMED */
async function getMyCustomerBookings(req, res) {
  const filter = { customer: req.user._id };
  const { status } = req.query;

  if (status) {
    const statuses = String(status).split(",");
    if (!statuses.every((value) => BOOKING_STATUS_VALUES.includes(value))) {
      throw new AppError(400, "Invalid status filter");
    }
    filter.status = { $in: statuses };
  }

  const bookings = await Booking.find(filter)
    .sort({ scheduledStartAt: -1 })
    .limit(100)
    .populate(BOOKING_POPULATE);

  res.json({ success: true, data: bookings.map(toResponse) });
}

/** GET /api/bookings/:id */
async function getBookingById(req, res) {
  await req.booking.populate(BOOKING_POPULATE);
  res.json({ success: true, data: toResponse(req.booking) });
}

async function startOptionalTransaction() {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    return session;
  } catch {
    if (session) await session.endSession();
    return null;
  }
}

/** PATCH /api/bookings/:id/reschedule body: { scheduledStartAt, note? } */
async function rescheduleCustomerBooking(req, res) {
  const { booking, user } = req;
  const { scheduledStartAt, note } = req.body;
  const fromStartAt = booking.scheduledStartAt;
  const fromEndAt = booking.scheduledEndAt;
  const durationMs = fromEndAt.getTime() - fromStartAt.getTime();
  const scheduledEndAt = new Date(scheduledStartAt.getTime() + durationMs);
  const now = new Date();

  if (booking.status !== BOOKING_STATUS.CONFIRMED || fromStartAt <= now) {
    throw new AppError(409, "Chỉ có thể đổi lịch booking đã xác nhận và chưa đến giờ thực hiện");
  }
  if (scheduledStartAt <= now) {
    throw new AppError(400, "Thời gian mới phải ở trong tương lai");
  }

  const overlappingBooking = await Booking.findOne({
    _id: { $ne: booking._id },
    provider: booking.provider,
    scheduledStartAt: { $lt: scheduledEndAt },
    scheduledEndAt: { $gt: scheduledStartAt },
    status: {
      $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW],
    },
  }).select("_id scheduledStartAt scheduledEndAt status").lean();

  if (overlappingBooking) {
    throw new AppError(409, "Thợ đã có lịch hẹn khác trong khung giờ này", {
      conflictingBookingId: overlappingBooking._id,
      scheduledStartAt: overlappingBooking.scheduledStartAt,
      scheduledEndAt: overlappingBooking.scheduledEndAt,
    });
  }

  const session = await startOptionalTransaction();
  const sessionOpts = session ? { session } : {};

  try {
    const updated = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        customer: user._id,
        status: BOOKING_STATUS.CONFIRMED,
        scheduledStartAt: fromStartAt,
        scheduledEndAt: fromEndAt,
      },
      {
        $set: { scheduledStartAt, scheduledEndAt },
        $push: {
          scheduleHistory: {
            fromStartAt,
            fromEndAt,
            toStartAt: scheduledStartAt,
            toEndAt: scheduledEndAt,
            changedBy: user._id,
            note,
            changedAt: now,
          },
        },
      },
      { new: true, runValidators: true, ...sessionOpts },
    );

    if (!updated) throw conflict();
    if (booking.request) {
      const requestUpdate = await ServiceRequest.updateOne(
        { _id: booking.request, customer: user._id },
        { $set: { preferredStartAt: scheduledStartAt, preferredEndAt: scheduledEndAt } },
        sessionOpts,
      );
      if (requestUpdate.matchedCount !== 1) {
        throw new AppError(409, "Không thể đồng bộ lịch mới với yêu cầu dịch vụ. Vui lòng tải lại booking.");
      }
    }
    if (session) await session.commitTransaction();

    await updated.populate(BOOKING_POPULATE);
    res.json({ success: true, message: "Đã đổi lịch booking", data: toResponse(updated) });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch {
        // Keep the original operation error.
      }
    }
    throw error;
  } finally {
    if (session) await session.endSession();
  }
}

/** POST /api/bookings/:id/cancel body: { reason } */
async function cancelCustomerBooking(req, res) {
  const { booking, user } = req;
  const { reason } = req.body;
  const now = new Date();

  const isPending = booking.status === BOOKING_STATUS.PENDING_CONFIRMATION;
  const isConfirmed = booking.status === BOOKING_STATUS.CONFIRMED && booking.scheduledStartAt > now;

  if (!isPending && !isConfirmed) {
    throw new AppError(409, "Chỉ có thể hủy booking đang chờ xác nhận hoặc đã xác nhận trước giờ thực hiện");
  }

  const session = await startOptionalTransaction();
  const sessionOpts = session ? { session } : {};

  try {
    const filter = {
      _id: booking._id,
      customer: user._id,
      status: booking.status,
      ...(isPending ? {} : { scheduledStartAt: { $gt: now } }),
    };

    const updated = await Booking.findOneAndUpdate(
      filter,
      {
        $set: {
          status: BOOKING_STATUS.CANCELLED,
          cancelledBy: "CUSTOMER",
          cancelReason: reason,
          cancellationReason: reason,
          cancelledAt: now,
        },
        $push: {
          statusHistory: {
            from: booking.status,
            to: BOOKING_STATUS.CANCELLED,
            changedBy: user._id,
            note: reason,
            changedAt: now,
          },
        },
      },
      { new: true, runValidators: true, ...sessionOpts },
    );

    if (!updated) throw conflict();
    if (booking.request) {
      const requestUpdate = await ServiceRequest.updateOne(
        { _id: booking.request, customer: user._id },
        {
          $set: {
            status: "CANCELLED",
            cancellationReason: reason,
            cancelledBy: user._id,
            cancelledAt: now,
          },
        },
        sessionOpts,
      );
      if (requestUpdate.matchedCount !== 1) {
        throw new AppError(409, "Không thể đồng bộ trạng thái hủy với yêu cầu dịch vụ. Vui lòng tải lại booking.");
      }
    }
    if (session) await session.commitTransaction();

    await updated.populate(BOOKING_POPULATE);
    res.json({ success: true, message: "Đã hủy booking", data: toResponse(updated) });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch {
        // Keep the original operation error.
      }
    }
    throw error;
  } finally {
    if (session) await session.endSession();
  }
}

// ─── Provider Accept / Decline (UC-14 / Confirm & Decline) ───────────────────

/**
 * PATCH /api/bookings/:bookingId/confirm
 * Provider confirms a PENDING_CONFIRMATION booking.
 * Checks for schedule overlaps per NFR-09 before confirming.
 * Idempotent: repeated calls on a CONFIRMED booking return 200 without side effects.
 */
async function confirmBooking(req, res) {
  const { booking, user } = req;

  // Idempotency check: if already confirmed by this provider, return success without duplicate side-effects
  if (booking.status === BOOKING_STATUS.CONFIRMED) {
    await booking.populate(BOOKING_POPULATE);
    return res.json({
      success: true,
      message: "Booking is already confirmed",
      data: toResponse(booking),
    });
  }

  // Guard: ensures booking is in PENDING_CONFIRMATION
  assertProviderTransition(booking, BOOKING_STATUS.CONFIRMED, { isDedicatedEndpoint: true });

  // NFR-09: Conflict check on active bookings:
  // existing.start < new.end && existing.end > new.start
  // (ignoring CANCELLED, COMPLETED, NO_SHOW)
  const overlappingBooking = await Booking.findOne({
    _id: { $ne: booking._id },
    provider: user._id,
    scheduledStartAt: { $lt: booking.scheduledEndAt },
    scheduledEndAt: { $gt: booking.scheduledStartAt },
    status: {
      $nin: [
        BOOKING_STATUS.CANCELLED,
        BOOKING_STATUS.COMPLETED,
        BOOKING_STATUS.NO_SHOW,
      ],
    },
  }).select("_id scheduledStartAt scheduledEndAt status").lean();

  if (overlappingBooking) {
    throw new AppError(409, "Bạn đã có một lịch hẹn khác trùng vào khung giờ này", {
      conflictingBookingId: overlappingBooking._id,
      scheduledStartAt: overlappingBooking.scheduledStartAt,
      scheduledEndAt: overlappingBooking.scheduledEndAt,
    });
  }

  const now = new Date();

  // Atomic conditional update (NFR-01)
  const updated = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      provider: user._id,
      status: BOOKING_STATUS.PENDING_CONFIRMATION,
    },
    {
      $set: { status: BOOKING_STATUS.CONFIRMED },
      $push: {
        statusHistory: {
          from: BOOKING_STATUS.PENDING_CONFIRMATION,
          to: BOOKING_STATUS.CONFIRMED,
          changedBy: user._id,
          note: "Thợ đã xác nhận nhận việc",
          changedAt: now,
        },
      },
    },
    { new: true, runValidators: true }
  ).populate(BOOKING_POPULATE);

  if (!updated) {
    // If concurrent request already confirmed it, remain idempotent
    const current = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
    if (current && current.status === BOOKING_STATUS.CONFIRMED && current.provider.toString() === user._id.toString()) {
      return res.json({
        success: true,
        message: "Booking is already confirmed",
        data: toResponse(current),
      });
    }
    throw new AppError(409, "Booking is no longer pending confirmation");
  }

  await createNotification({
    recipient: updated.customer?._id || updated.customer,
    type: "BOOKING_CONFIRMED",
    title: "Booking đã được xác nhận",
    message: "Thợ đã xác nhận lịch đặt dịch vụ của bạn.",
    resourceType: "BOOKING",
    resourceId: updated._id,
  });

  res.json({
    success: true,
    message: STATUS_MESSAGES[BOOKING_STATUS.CONFIRMED],
    data: toResponse(updated),
  });
}

/**
 * PATCH /api/bookings/:bookingId/decline
 * body: { reasonCode, note? }
 * Provider declines a PENDING_CONFIRMATION booking.
 * Runs in a MongoDB Transaction (NFR-01):
 *  - Booking -> CANCELLED, cancelledBy = 'PROVIDER', reasonCode, cancelReason
 *  - ServiceRequest -> OPEN
 */
async function declineBooking(req, res) {
  const { booking, user } = req;
  const { reasonCode, note } = req.body;

  // Guard: ensures booking is in PENDING_CONFIRMATION and reasonCode is provided
  assertProviderTransition(booking, BOOKING_STATUS.CANCELLED, {
    isDedicatedEndpoint: true,
    reasonCode,
  });

  const now = new Date();
  const label = DECLINE_LABELS[reasonCode] || "Lý do khác";
  const cancelReason = reasonCode === DECLINE_REASON.OTHER
    ? (note || "Lý do khác")
    : (note ? `${label}: ${note}` : label);

  // MongoDB Transaction setup (safe across replica set and standalone environments)
  let session = null;
  let inTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    inTransaction = true;
  } catch {
    if (session) {
      session.endSession();
      session = null;
    }
  }

  try {
    const sessionOpts = session ? { session } : {};

    // 1. Atomic conditional update on Booking
    const updated = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        provider: user._id,
        status: BOOKING_STATUS.PENDING_CONFIRMATION,
      },
      {
        $set: {
          status: BOOKING_STATUS.CANCELLED,
          cancelledBy: "PROVIDER",
          cancelReason,
          cancellationReason: cancelReason,
          reasonCode,
          cancelledAt: now,
        },
        $push: {
          statusHistory: {
            from: BOOKING_STATUS.PENDING_CONFIRMATION,
            to: BOOKING_STATUS.CANCELLED,
            changedBy: user._id,
            note: cancelReason,
            changedAt: now,
          },
        },
      },
      { new: true, runValidators: true, ...sessionOpts }
    );

    if (!updated) {
      if (inTransaction) await session.abortTransaction();
      throw new AppError(409, "Booking is no longer pending confirmation");
    }

    // 2. ServiceRequest -> OPEN & add this provider to declinedProviders
    const reqId = booking.request?._id || booking.request;
    if (reqId) {
      await ServiceRequest.updateOne(
        { _id: reqId },
        {
          $set: { status: "OPEN" },
          $addToSet: { declinedProviders: user._id },
        },
        sessionOpts
      );
    }

    

    if (inTransaction) {
      await session.commitTransaction();
    }

    await createNotification({
      recipient: updated.customer?._id || updated.customer,
      type: "BOOKING_DECLINED",
      title: "Booking bị từ chối",
      message: "Thợ không thể nhận lịch đặt dịch vụ này.",
      resourceType: "BOOKING",
      resourceId: updated._id,
    });

    await updated.populate(BOOKING_POPULATE);

    res.json({
      success: true,
      message: "Đã từ chối đơn đặt dịch vụ",
      data: toResponse(updated),
    });
  } catch (error) {
    if (inTransaction) {
      try {
        await session.abortTransaction();
      } catch {
        // ignore rollback errors
      }
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

/**
 * Optional periodic job: Expire bookings waiting for provider response > BOOKING_RESPONSE_TIMEOUT_HOURS.
 */
async function expirePendingBookings() {
  const threshold = new Date(Date.now() - BOOKING_RESPONSE_TIMEOUT_HOURS * 60 * 60 * 1000);
  const expiredBookings = await Booking.find({
    status: BOOKING_STATUS.PENDING_CONFIRMATION,
    createdAt: { $lte: threshold },
  });

  const results = [];
  for (const b of expiredBookings) {
    const now = new Date();
    const cancelReason = DECLINE_LABELS[DECLINE_REASON.NO_RESPONSE];

    const updated = await Booking.findOneAndUpdate(
      { _id: b._id, status: BOOKING_STATUS.PENDING_CONFIRMATION },
      {
        $set: {
          status: BOOKING_STATUS.CANCELLED,
          cancelledBy: "SYSTEM",
          reasonCode: DECLINE_REASON.NO_RESPONSE,
          cancelReason,
          cancellationReason: cancelReason,
          cancelledAt: now,
        },
        $push: {
          statusHistory: {
            from: BOOKING_STATUS.PENDING_CONFIRMATION,
            to: BOOKING_STATUS.CANCELLED,
            changedBy: b.provider,
            note: cancelReason,
            changedAt: now,
          },
        },
      },
      { new: true }
    );

    if (updated) {
      const reqId = b.request?._id || b.request;
      if (reqId) {
        await ServiceRequest.updateOne(
          { _id: reqId },
          {
            $set: { status: "OPEN" },
            $addToSet: { declinedProviders: b.provider },
          }
        );
      }
      results.push(updated._id);
    }
  }

  return results;
}

// ─── UC-38: Update Service Status ─────────────────────────────────────────────

/** PATCH /api/bookings/:id/status   body: { status, note?, confirmCompletion? } */
async function updateServiceStatus(req, res) {
  const { booking, user } = req;
  const { status: nextStatus, note, confirmCompletion } = req.body;
  const from = booking.status;

  // assertProviderTransition with isDedicatedEndpoint = false blocks jumps from/to PENDING_CONFIRMATION/CONFIRMED/CANCELLED
  assertProviderTransition(booking, nextStatus, { confirmCompletion, isDedicatedEndpoint: false });

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
    { new: true, runValidators: true }
  ).populate(BOOKING_POPULATE);

  if (!updated) throw conflict();

  await createNotification({
    recipient: updated.customer?._id || updated.customer,
    type: "BOOKING_STATUS_UPDATED",
    title: "Cập nhật tiến độ dịch vụ",
    message: STATUS_MESSAGES[nextStatus] || "Trạng thái dịch vụ đã được cập nhật.",
    resourceType: "BOOKING",
    resourceId: updated._id,
  });

  res.json({ success: true, message: STATUS_MESSAGES[nextStatus], data: toResponse(updated) });
}

/** POST /api/bookings/:id/materials   body: { items: [{ name, quantity, price, note? }] } */
async function addMaterialAndFee(req, res) {
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
    { new: true, runValidators: true }
  ).populate(BOOKING_POPULATE);

  if (!updated) throw conflict();

  await createNotification({
    recipient: updated.customer?._id || updated.customer,
    type: "MATERIALS_PENDING_APPROVAL",
    title: "Chi phí phát sinh cần bạn duyệt",
    message: "Thợ đã gửi vật liệu hoặc chi phí phát sinh chờ bạn xem xét.",
    resourceType: "BOOKING",
    resourceId: updated._id,
  });

  res.status(201).json({
    success: true,
    message: `${docs.length} item(s) added and pending customer approval`,
    data: toResponse(updated),
  });
}

/** DELETE /api/bookings/:id/materials/:materialId  (only PENDING items while IN_PROGRESS) */
async function removeMaterial(req, res) {
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
    { new: true }
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
async function decideMaterials(req, res) {
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
    { new: true, arrayFilters: [{ "m.approvalStatus": MATERIAL_APPROVAL.PENDING }] }
  );

  if (!updated) throw conflict();

  // Keep the cached approved total in sync.
  updated.additionalFees = sumMaterials(updated.materials, MATERIAL_APPROVAL.APPROVED);
  await Booking.updateOne({ _id: updated._id }, { $set: { additionalFees: updated.additionalFees } });
  await updated.populate(BOOKING_POPULATE);

  res.json({ success: true, message: `Extra costs ${decision.toLowerCase()}`, data: toResponse(updated) });
}


/**
 * POST /api/requests/:requestId/select-provider
 * Customer selects a provider for an OPEN request.
 * Creates a Booking in PENDING_CONFIRMATION status inside a MongoDB transaction (NFR-01).
 * Transitions ServiceRequest to BOOKED.
 */
async function selectProvider(req, res) {
  const { requestId } = req.params;
  const { providerId, scheduledStartAt: customStartAt } = req.body;

  if (!mongoose.isValidObjectId(requestId)) {
    throw new AppError(400, "Mã yêu cầu không hợp lệ", [{ field: "requestId", message: "invalid ObjectId" }]);
  }
  if (!providerId || !mongoose.isValidObjectId(providerId)) {
    throw new AppError(400, "Vui lòng chọn một thợ hợp lệ", [{ field: "providerId", message: "invalid ObjectId" }]);
  }

  const request = await ServiceRequest.findById(requestId).populate("service");
  if (!request) {
    throw new AppError(404, "Không tìm thấy yêu cầu dịch vụ");
  }

  // Auth guard: customer must own the request
  if (request.customer.toString() !== req.user._id.toString()) {
    throw new AppError(403, "Bạn không có quyền thao tác trên yêu cầu này");
  }

  // Status guard: request must be OPEN
  if (request.status !== "OPEN") {
    throw new AppError(409, "Yêu cầu không ở trạng thái mở");
  }

  // Guard: thợ không nằm trong declinedProviders
  if (request.declinedProviders?.some((id) => id.toString() === providerId.toString())) {
    throw new AppError(422, "Thợ này đã từ chối yêu cầu trước đó, vui lòng chọn thợ khác");
  }

  // Validate Provider User
  const providerUser = await User.findById(providerId);
  if (!providerUser || providerUser.role !== "PROVIDER" || providerUser.status !== "ACTIVE") {
    throw new AppError(422, "Thợ không tồn tại hoặc tài khoản đang bị khóa");
  }

  // Validate Provider Profile & Skills
  const profile = await ProviderProfile.findOne({ user: providerId }).populate("skills");
  if (!profile || profile.verificationStatus !== "VERIFIED") {
    throw new AppError(422, "Hồ sơ thợ chưa được xác thực");
  }

  const requestCategoryId = (request.category || request.service?.category)?.toString();
  if (requestCategoryId && profile.skills?.length) {
    const hasSkill = profile.skills.some((s) => (s._id || s).toString() === requestCategoryId);
    if (!hasSkill) {
      throw new AppError(422, "Thợ không có kỹ năng phù hợp với dịch vụ này");
    }
  }

  // Time calculations & schedule conflict check (NFR-09)
  const scheduledStartAt = customStartAt ? new Date(customStartAt) : new Date(request.preferredStartAt);
  if (isNaN(scheduledStartAt.getTime()) || scheduledStartAt <= new Date()) {
    throw new AppError(400, "Thời gian bắt đầu dịch vụ không hợp lệ hoặc nằm trong quá khứ");
  }

  const durationMin = request.service?.estimatedDurationMinutes || 60;
  const scheduledEndAt = new Date(scheduledStartAt.getTime() + durationMin * 60000);

  // Check NFR-09: Overlapping bookings for provider
  const overlappingBooking = await Booking.findOne({
    provider: providerId,
    status: {
      $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW],
    },
    scheduledStartAt: { $lt: scheduledEndAt },
    scheduledEndAt: { $gt: scheduledStartAt },
  });
  if (overlappingBooking) {
    throw new AppError(409, "Thợ đã có lịch trong khung giờ này", {
      conflictingBookingId: overlappingBooking._id,
      scheduledStartAt: overlappingBooking.scheduledStartAt,
      scheduledEndAt: overlappingBooking.scheduledEndAt,
    });
  }

  // Snapshot price from service.basePrice
  const price = typeof request.service?.basePrice === "number" ? request.service.basePrice : 0;

  // MongoDB Transaction (NFR-01)
  let session = null;
  let inTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    inTransaction = true;
  } catch {
    if (session) {
      session.endSession();
      session = null;
    }
  }

  try {
    const sessionOpts = session ? { session } : {};

    // 1. Atomically transition ServiceRequest: OPEN -> BOOKED
    const updatedRequest = await ServiceRequest.findOneAndUpdate(
      { _id: requestId, status: "OPEN", customer: req.user._id },
      { $set: { status: "BOOKED" } },
      { new: true, runValidators: true, ...sessionOpts }
    );

    if (!updatedRequest) {
      if (inTransaction) await session.abortTransaction();
      throw new AppError(409, "Yêu cầu không còn ở trạng thái mở");
    }

    // 2. Create Booking in PENDING_CONFIRMATION
    const [booking] = await Booking.create(
      [
        {
          request: updatedRequest._id,
          customer: req.user._id,
          provider: providerId,
          service: updatedRequest.service?._id || updatedRequest.service,
          scheduledStartAt,
          scheduledEndAt,
          address: updatedRequest.address,
          price,
          status: BOOKING_STATUS.PENDING_CONFIRMATION,
          paymentStatus: "UNPAID",
          statusHistory: [
            {
              from: BOOKING_STATUS.PENDING_CONFIRMATION,
              to: BOOKING_STATUS.PENDING_CONFIRMATION,
              changedBy: req.user._id,
              note: "Khách hàng chọn thợ và đặt lịch",
              changedAt: new Date(),
            },
          ],
        },
      ],
      sessionOpts
    );

    if (inTransaction) {
      await session.commitTransaction();
    }

    // Notification
    await createNotification({
      recipient: providerId,
      type: "BOOKING_CREATED",
      title: "Có yêu cầu dịch vụ mới",
      message: "Khách hàng đã chọn bạn cho một yêu cầu dịch vụ mới. Vui lòng xác nhận trong 12h.",
      resourceType: "BOOKING",
      resourceId: booking._id,
    });

    res.status(201).json({
      success: true,
      message: "Đã chọn thợ và tạo lịch đặt thành công",
      data: {
        booking: toResponse(booking),
        request: updatedRequest,
      },
    });
  } catch (err) {
    if (inTransaction) await session.abortTransaction();
    throw err;
  } finally {
    if (session) session.endSession();
  }
}

module.exports = {
  selectProvider,
  getMyProviderBookings,
  getMyCustomerBookings,
  getBookingById,
  confirmBooking,
  declineBooking,
  expirePendingBookings,
  updateServiceStatus,
  addMaterialAndFee,
  removeMaterial,
  decideMaterials,
  rescheduleCustomerBooking,
  cancelCustomerBooking,
};
