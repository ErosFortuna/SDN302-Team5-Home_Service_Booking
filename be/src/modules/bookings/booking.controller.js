const mongoose = require("mongoose");
const Booking = require("./booking.model.js");
const User = require("../users/user.model.js");
const ProviderProfile = require("../providers/provider.model.js");
const ServiceRequest = require("../requests/request.model.js");
const Availability = require("../availability/availability.model.js");
const Review = require("../reviews/review.model.js");
const { createNotification } = require("../notifications/notification.service.js");
require("../services/service.model.js"); // registers `Service` for populate()
const { AppError } = require("../../shared/app-error.js");
const {
  startManagedTransaction,
  isTransientOrWriteConflict,
  MAX_TX_RETRIES,
} = require("../../shared/transaction.js");
const { evaluateScheduleMatch, haversineKm } = require("../providers/provider.matching.js");
const {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  DECLINE_REASON,
  BOOKING_RESPONSE_TIMEOUT_HOURS,
  MAX_FINAL_PRICE_RATIO,
  assertProviderTransition,
  getAllowedProviderTransitions,
} = require("./booking.status.js");

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
const toResponse = (booking, distanceKm) => ({
  ...booking.toJSON(),
  allowedTransitions: getAllowedProviderTransitions(booking.status),
  ...(distanceKm != null && !Number.isNaN(distanceKm) ? { distanceKm } : {}),
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

  const [bookings, providerProfile] = await Promise.all([
    Booking.find(filter)
      .sort({ scheduledStartAt: 1 })
      .limit(100)
      .populate(BOOKING_POPULATE),
    ProviderProfile.findOne({ user: req.user._id }).select("location").lean(),
  ]);

  const provCoords = providerProfile?.location?.coordinates;

  const data = bookings.map((b) => {
    let distanceKm = null;
    const custCoords = b.address?.location?.coordinates || b.request?.address?.location?.coordinates;
    if (
      Array.isArray(provCoords) && provCoords.length === 2 &&
      Array.isArray(custCoords) && custCoords.length === 2
    ) {
      distanceKm = haversineKm(provCoords[1], provCoords[0], custCoords[1], custCoords[0]);
    }
    return toResponse(b, distanceKm);
  });

  res.json({ success: true, data });
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

  const bookingIds = bookings.map((booking) => booking._id);
  const customerReviews = bookingIds.length
    ? await Review.find({
        booking: { $in: bookingIds },
        customer: req.user._id,
      }).select("booking rating comment").lean()
    : [];
  const reviewsByBooking = new Map(
    customerReviews.map((review) => [review.booking.toString(), {
      rating: review.rating,
      comment: review.comment || "",
    }]),
  );

  const providerUserIds = bookings
    .map((b) => (b.provider && (b.provider._id || b.provider))?.toString())
    .filter(Boolean);

  const providerProfiles = providerUserIds.length > 0
    ? await ProviderProfile.find({ user: { $in: providerUserIds } }).select("user location").lean()
    : [];

  const provLocMap = new Map();
  providerProfiles.forEach((p) => {
    if (p.user && Array.isArray(p.location?.coordinates)) {
      provLocMap.set(p.user.toString(), p.location.coordinates);
    }
  });

  const data = bookings.map((b) => {
    let distanceKm = null;
    const provUserId = (b.provider && (b.provider._id || b.provider))?.toString();
    const provCoords = provLocMap.get(provUserId);
    const custCoords = b.address?.location?.coordinates || b.request?.address?.location?.coordinates;
    if (
      Array.isArray(provCoords) && provCoords.length === 2 &&
      Array.isArray(custCoords) && custCoords.length === 2
    ) {
      distanceKm = haversineKm(provCoords[1], provCoords[0], custCoords[1], custCoords[0]);
    }
    return {
      ...toResponse(b, distanceKm),
      customerReview: reviewsByBooking.get(b._id.toString()) || null,
    };
  });

  res.json({ success: true, data });
}

/** GET /api/bookings (STAFF / ADMIN: View all bookings) */
async function getAllBookingsForStaff(req, res) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const { status } = req.query;

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, "Invalid pagination parameters");
  }

  const filter = {};
  if (status) {
    const statuses = String(status).split(",");
    if (!statuses.every((s) => BOOKING_STATUS_VALUES.includes(s))) {
      throw new AppError(400, "Invalid status filter");
    }
    filter.status = { $in: statuses };
  }

  const [bookings, totalItems] = await Promise.all([
    Booking.find(filter)
      .sort({ scheduledStartAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(BOOKING_POPULATE),
    Booking.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  res.json({
    success: true,
    data: bookings.map(toResponse),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}

/** GET /api/bookings/:id */
async function getBookingById(req, res) {
  await req.booking.populate(BOOKING_POPULATE);
  let distanceKm = null;
  const b = req.booking;
  const provUserId = (b.provider && (b.provider._id || b.provider))?.toString();
  const custCoords = b.address?.location?.coordinates || b.request?.address?.location?.coordinates;
  if (provUserId && Array.isArray(custCoords) && custCoords.length === 2) {
    const provProfile = await ProviderProfile.findOne({ user: provUserId }).select("location").lean();
    const provCoords = provProfile?.location?.coordinates;
    if (Array.isArray(provCoords) && provCoords.length === 2) {
      distanceKm = haversineKm(provCoords[1], provCoords[0], custCoords[1], custCoords[0]);
    }
  }
  res.json({ success: true, data: toResponse(req.booking, distanceKm) });
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

  const isPrivileged = ['STAFF', 'ADMIN'].includes(user.role);
  const provUserId = (booking.provider && (booking.provider._id || booking.provider))?.toString();

  let attempt = 0;
  while (attempt < MAX_TX_RETRIES) {
    attempt++;
    const { session, inTransaction } = await startManagedTransaction();
    const sessionOpts = session ? { session } : {};

    try {
      // 1. Soft-lock provider on ProviderProfile to trigger WriteConflict on concurrent transactions for same provider
      if (session && provUserId && mongoose.isValidObjectId(provUserId)) {
        const isStubbed = typeof ProviderProfile.findOneAndUpdate === 'function' &&
          ProviderProfile.findOneAndUpdate !== mongoose.Model.findOneAndUpdate;
        if (mongoose.connection.readyState !== 0 || isStubbed) {
          await ProviderProfile.findOneAndUpdate(
            { user: provUserId },
            { $inc: { bookingLockVersion: 1 } },
            { session, new: true }
          );
        }
      }

      let overlapQuery = Booking.findOne({
        _id: { $ne: booking._id },
        provider: booking.provider,
        scheduledStartAt: { $lt: scheduledEndAt },
        scheduledEndAt: { $gt: scheduledStartAt },
        status: {
          $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW],
        },
      });
      if (session && typeof overlapQuery?.session === 'function') overlapQuery = overlapQuery.session(session);
      const overlappingBooking = await overlapQuery.select("_id scheduledStartAt scheduledEndAt status").lean();

      if (overlappingBooking) {
        throw new AppError(409, "Thợ đã có lịch hẹn khác trong khung giờ này", {
          conflictingBookingId: overlappingBooking._id,
          scheduledStartAt: overlappingBooking.scheduledStartAt,
          scheduledEndAt: overlappingBooking.scheduledEndAt,
        });
      }

      const filter = {
        _id: booking._id,
        status: BOOKING_STATUS.CONFIRMED,
        scheduledStartAt: fromStartAt,
        scheduledEndAt: fromEndAt,
        ...(!isPrivileged ? { customer: user._id } : {}),
      };

      const updated = await Booking.findOneAndUpdate(
        filter,
        {
          $set: { scheduledStartAt, scheduledEndAt },
          $push: {
            scheduleHistory: {
              fromStartAt,
              fromEndAt,
              toStartAt: scheduledStartAt,
              toEndAt: scheduledEndAt,
              changedBy: user._id,
              note: note || (isPrivileged ? `Đổi lịch bởi ${user.role}` : undefined),
              changedAt: now,
            },
          },
        },
        { new: true, runValidators: true, ...sessionOpts },
      );

      if (!updated) throw conflict();
      if (booking.request) {
        const requestFilter = {
          _id: booking.request,
          ...(!isPrivileged ? { customer: user._id } : {}),
        };
        const requestUpdate = await ServiceRequest.updateOne(
          requestFilter,
          { $set: { preferredStartAt: scheduledStartAt, preferredEndAt: scheduledEndAt } },
          sessionOpts,
        );
        if (requestUpdate.matchedCount !== 1) {
          throw new AppError(409, "Không thể đồng bộ lịch mới với yêu cầu dịch vụ. Vui lòng tải lại booking.");
        }
      }
      if (inTransaction) await session.commitTransaction();

      await updated.populate(BOOKING_POPULATE);
      return res.json({ success: true, message: "Đã đổi lịch booking", data: toResponse(updated) });
    } catch (error) {
      if (inTransaction) {
        try {
          await session.abortTransaction();
        } catch {
          // Keep the original operation error.
        }
      }
      if (error?.code === 11000) {
        throw new AppError(409, "Thợ đã có lịch hẹn khác vào thời điểm này", error.keyValue);
      }
      if (inTransaction && isTransientOrWriteConflict(error) && attempt < MAX_TX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 25));
        continue;
      }
      if (isTransientOrWriteConflict(error)) {
        throw new AppError(409, "Thợ đang có giao dịch đổi lịch khác xử lý đồng thời, vui lòng thử lại sau giây lát", {
          originalError: error.message,
        });
      }
      throw error;
    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch {}
      }
    }
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

  const isPrivileged = ['STAFF', 'ADMIN'].includes(user.role);
  const { session, inTransaction } = await startManagedTransaction();
  const sessionOpts = session ? { session } : {};

  try {
    const filter = {
      _id: booking._id,
      status: booking.status,
      ...(!isPrivileged ? { customer: user._id } : {}),
      ...(isPending ? {} : { scheduledStartAt: { $gt: now } }),
    };

    const updated = await Booking.findOneAndUpdate(
      filter,
      {
        $set: {
          status: BOOKING_STATUS.CANCELLED,
          cancelledBy: isPrivileged ? user.role : "CUSTOMER",
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
      const requestFilter = {
        _id: booking.request,
        ...(!isPrivileged ? { customer: user._id } : {}),
      };
      const requestUpdate = await ServiceRequest.updateOne(
        requestFilter,
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
    if (inTransaction) await session.commitTransaction();

    await updated.populate(BOOKING_POPULATE);
    res.json({ success: true, message: "Đã hủy booking", data: toResponse(updated) });
  } catch (error) {
    if (inTransaction) {
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

  const { session, inTransaction } = await startManagedTransaction();

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

/** PATCH /api/bookings/:id/status   body: { status, note?, confirmCompletion?, finalPrice? } */
async function updateServiceStatus(req, res) {
  const { booking, user } = req;
  const { status: nextStatus, note, confirmCompletion, photos, finalPrice } = req.body;
  const from = booking.status;
  const isPrivileged = ['STAFF', 'ADMIN'].includes(user && user.role);

  // assertProviderTransition with isDedicatedEndpoint = false blocks jumps from/to PENDING_CONFIRMATION/CONFIRMED/CANCELLED
  if (from !== nextStatus) {
    assertProviderTransition(booking, nextStatus, { confirmCompletion, isDedicatedEndpoint: false });
  } else if (!isPrivileged) {
    throw new AppError(409, `Booking is already ${from}`);
  }

  // Enforce upper bound on finalPrice for non-privileged users (PROVIDER)
  if (finalPrice !== undefined) {
    const agreedPrice = typeof booking.price === 'number' ? booking.price : Number(booking.price) || 0;
    const maxAllowedPrice = Math.round(agreedPrice * MAX_FINAL_PRICE_RATIO);
    if (!isPrivileged && finalPrice > maxAllowedPrice) {
      throw new AppError(
        422,
        `Giá cuối cùng (${finalPrice.toLocaleString('vi-VN')} đ) không được vượt quá ${Math.round(MAX_FINAL_PRICE_RATIO * 100)}% giá đã thoả thuận (${maxAllowedPrice.toLocaleString('vi-VN')} đ). Vui lòng liên hệ nhân viên hỗ trợ nếu có chi phí phát sinh đặc biệt.`,
        [
          {
            field: 'finalPrice',
            message: `finalPrice cannot exceed ${Math.round(MAX_FINAL_PRICE_RATIO * 100)}% of the agreed price (${maxAllowedPrice})`,
          },
        ]
      );
    }
  }

  const now = new Date();
  const $set = { status: nextStatus };
  if (nextStatus === BOOKING_STATUS.IN_PROGRESS && !booking.startedAt) $set.startedAt = now;
  if (nextStatus === BOOKING_STATUS.COMPLETED) {
    if (!booking.completedAt) $set.completedAt = now;
    // NOTE (V-05): paymentStatus is NOT automatically set to 'PAID' upon completion.
    // In direct payment mode, completion transitions paymentStatus to 'COD' (Cash On Delivery),
    // awaiting explicit payment confirmation from the customer.
    if (booking.paymentStatus !== 'PAID') {
      $set.paymentStatus = 'COD';
    }
    if (note) $set.completionNote = note;
    if (finalPrice !== undefined) $set.finalPrice = finalPrice;
  }

  // Atomic compare-and-set on the current status prevents double submits / race conditions.
  const guard = isPrivileged
    ? (from === nextStatus ? { _id: booking._id } : { _id: booking._id, status: from })
    : { _id: booking._id, provider: user._id, status: from };
  const updateOps = {
    $set,
    $push: { statusHistory: { from, to: nextStatus, changedBy: user._id, note, changedAt: now } },
  };

  if (Array.isArray(photos) && photos.length > 0) {
    updateOps.$push.progressPhotos = { $each: photos };
    if (nextStatus === BOOKING_STATUS.COMPLETED) {
      updateOps.$push.proofPhotos = { $each: photos };
    }
  }

  const updated = await Booking.findOneAndUpdate(
    guard,
    updateOps,
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

/** PATCH /api/bookings/:id/adjust (STAFF / ADMIN only) body: { finalPrice?, paymentStatus?, note? } */
async function adjustBookingByStaff(req, res) {
  const { booking, user } = req;
  const { finalPrice, paymentStatus, note } = req.body;

  const now = new Date();
  const $set = {};
  if (finalPrice !== undefined) $set.finalPrice = finalPrice;
  if (paymentStatus !== undefined) $set.paymentStatus = paymentStatus;

  const changes = [];
  if (finalPrice !== undefined) changes.push(`finalPrice: ${finalPrice}`);
  if (paymentStatus !== undefined) changes.push(`paymentStatus: ${paymentStatus}`);
  const historyNote = note || `Điều chỉnh bởi ${user.role}: ${changes.join(', ')}`;

  const updateOps = {
    $set,
    $push: {
      statusHistory: {
        from: booking.status,
        to: booking.status,
        changedBy: user._id,
        note: historyNote,
        changedAt: now,
      },
    },
  };

  const updated = await Booking.findByIdAndUpdate(
    booking._id,
    updateOps,
    { new: true, runValidators: true }
  ).populate(BOOKING_POPULATE);

  if (!updated) {
    throw new AppError(404, 'Booking not found');
  }

  res.json({
    success: true,
    message: 'Điều chỉnh thông tin đơn đặt thành công',
    data: toResponse(updated),
  });
}

/**
 * POST /api/bookings/:id/confirm-payment (CUSTOMER only)
 * Customer confirms they have settled payment directly with the provider in cash (COD).
 */
async function confirmCustomerPayment(req, res) {
  const { booking, user } = req;

  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    throw new AppError(422, 'Chỉ có thể xác nhận thanh toán khi dịch vụ đã hoàn thành');
  }

  if (booking.paymentStatus === 'PAID') {
    return res.json({
      success: true,
      message: 'Đơn đặt này đã được xác nhận thanh toán trước đó',
      data: toResponse(booking),
    });
  }

  const now = new Date();
  const note = req.body?.note || 'Khách hàng xác nhận đã thanh toán trực tiếp (tiền mặt/COD)';

  const updated = await Booking.findByIdAndUpdate(
    booking._id,
    {
      $set: { paymentStatus: 'PAID' },
      $push: {
        statusHistory: {
          from: booking.status,
          to: booking.status,
          changedBy: user._id,
          note,
          changedAt: now,
        },
      },
    },
    { new: true, runValidators: true }
  ).populate(BOOKING_POPULATE);

  if (!updated) {
    throw new AppError(404, 'Booking not found');
  }

  const totalAmount = updated.finalPrice ?? updated.price ?? 0;
  await createNotification({
    recipient: updated.provider?._id || updated.provider,
    type: 'BOOKING_PAYMENT_CONFIRMED',
    title: 'Khách hàng đã xác nhận thanh toán',
    message: `Khách hàng đã xác nhận thanh toán số tiền ${totalAmount.toLocaleString('vi-VN')} đ.`,
    resourceType: 'BOOKING',
    resourceId: updated._id,
  });

  res.json({
    success: true,
    message: 'Xác nhận thanh toán thành công',
    data: toResponse(updated),
  });
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

  // Auth guard: STAFF and ADMIN can dispatch; CUSTOMER owner can self-select
  const callerRole = req.user?.role || 'STAFF';
  const isPrivileged = ['STAFF', 'ADMIN'].includes(callerRole);
  const isOwner = request.customer && (request.customer._id || request.customer).toString() === req.user?._id?.toString();
  if (!isPrivileged && !isOwner) {
    throw new AppError(403, "Bạn không có quyền chọn thợ cho yêu cầu này");
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

  const availability = await Availability.findOne({ provider: providerId });
  const travelBufferMinutes = availability?.settings?.travelBufferMinutes ?? 30;
  const earliestRelevantBookingEndAt = new Date(
    scheduledStartAt.getTime() - travelBufferMinutes * 60000
  );

  // Snapshot price from service.basePrice
  const price = typeof request.service?.basePrice === "number" ? request.service.basePrice : 0;

  let booking;
  let updatedRequest;
  const customerId = request.customer?._id || request.customer;
  const isCustomerSelfSelect = !isPrivileged && isOwner;
  const actorName = isCustomerSelfSelect
    ? (req.user?.fullName || 'Khách hàng')
    : (req.user?.fullName || (callerRole === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên CSKH'));
  const noteText = isCustomerSelfSelect
    ? `Khách hàng (${actorName}) chọn thợ`
    : `Nhân viên điều phối (${actorName}) gán thợ`;

  // MongoDB Transaction with Provider Soft-Lock & Retry (NFR-01, V-12)
  let attempt = 0;
  while (attempt < MAX_TX_RETRIES) {
    attempt++;
    const { session, inTransaction } = await startManagedTransaction();
    const sessionOpts = session ? { session } : {};

    try {
      // 1. Soft-lock provider on ProviderProfile to trigger WriteConflict on concurrent transactions for same provider
      if (session && providerId && mongoose.isValidObjectId(providerId)) {
        const isStubbed = typeof ProviderProfile.findOneAndUpdate === 'function' &&
          ProviderProfile.findOneAndUpdate !== mongoose.Model.findOneAndUpdate;
        if (mongoose.connection.readyState !== 0 || isStubbed) {
          await ProviderProfile.findOneAndUpdate(
            { user: providerId },
            { $inc: { bookingLockVersion: 1 } },
            { session, new: true }
          );
        }
      }

      // 2. Check NFR-09 & V-12: Overlapping bookings for provider inside transaction
      let overlapQuery = Booking.findOne({
        provider: providerId,
        status: {
          $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW],
        },
        scheduledStartAt: { $lt: scheduledEndAt },
        scheduledEndAt: { $gt: earliestRelevantBookingEndAt },
      });
      if (session && typeof overlapQuery?.session === 'function') overlapQuery = overlapQuery.session(session);
      const overlappingBooking = await overlapQuery;

      const scheduleEvaluation = evaluateScheduleMatch(
        scheduledStartAt,
        scheduledEndAt,
        availability ? [availability] : [],
        overlappingBooking ? [overlappingBooking] : []
      );
      if (!scheduleEvaluation.isEligible) {
        if (scheduleEvaluation.matchType === "BOOKING_CONFLICT") {
          throw new AppError(409, "Thợ đã có lịch trong khung giờ này hoặc chưa đủ thời gian di chuyển", {
            conflictingBookingId: overlappingBooking?._id,
            scheduledStartAt: overlappingBooking?.scheduledStartAt,
            scheduledEndAt: overlappingBooking?.scheduledEndAt,
          });
        }
        throw new AppError(409, "Thợ không nhận lịch trong khung giờ đã chọn", {
          availabilityReason: scheduleEvaluation.matchType,
        });
      }

      // 3. Atomically transition ServiceRequest: OPEN -> BOOKED
      updatedRequest = await ServiceRequest.findOneAndUpdate(
        { _id: requestId, status: "OPEN" },
        { $set: { status: "BOOKED" } },
        { new: true, runValidators: true, ...sessionOpts }
      );

      if (!updatedRequest) {
        throw new AppError(409, "Yêu cầu không còn ở trạng thái mở");
      }

      // 4. Create Booking in PENDING_CONFIRMATION
      const createdBookings = await Booking.create(
        [
          {
            request: updatedRequest._id,
            customer: customerId,
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
                changedBy: req.user?._id || customerId,
                note: noteText,
                changedAt: new Date(),
              },
            ],
          },
        ],
        sessionOpts
      );
      booking = createdBookings[0];

      if (inTransaction) {
        await session.commitTransaction();
      }
      break;
    } catch (err) {
      if (inTransaction) {
        try {
          await session.abortTransaction();
        } catch {}
      }
      if (err?.code === 11000) {
        throw new AppError(409, "Thợ đã có lịch hẹn khác vào thời điểm này", err.keyValue);
      }
      if (inTransaction && isTransientOrWriteConflict(err) && attempt < MAX_TX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 25));
        continue;
      }
      if (isTransientOrWriteConflict(err)) {
        throw new AppError(409, "Thợ đang có giao dịch đặt lịch khác xử lý đồng thời, vui lòng thử lại sau giây lát", {
          originalError: err.message,
        });
      }
      throw err;
    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch {}
      }
    }
  }

  // Notification to Provider
  await createNotification({
    recipient: providerId,
    type: "BOOKING_CREATED",
    title: isCustomerSelfSelect ? "Khách hàng đã chọn bạn" : "Có yêu cầu dịch vụ được điều phối",
    message: isCustomerSelfSelect
      ? `Khách hàng (${actorName}) đã chọn bạn cho yêu cầu dịch vụ. Vui lòng xác nhận trong 12h.`
      : "Nhân viên điều phối đã gán bạn vào một yêu cầu dịch vụ mới. Vui lòng xác nhận trong 12h.",
    resourceType: "BOOKING",
    resourceId: booking._id,
  });

  // Notification to Customer
  await createNotification({
    recipient: customerId,
    type: "BOOKING_CREATED",
    title: isCustomerSelfSelect ? "Đã gửi yêu cầu tới thợ" : "Yêu cầu đã được phân công thợ",
    message: isCustomerSelfSelect
      ? `Bạn đã chọn thợ (${providerUser.fullName}) cho yêu cầu dịch vụ. Vui lòng chờ thợ xác nhận.`
      : "Nhân viên vận hành đã phân công thợ (" + providerUser.fullName + ") cho yêu cầu dịch vụ của bạn. Vui lòng chờ thợ xác nhận.",
    resourceType: "BOOKING",
    resourceId: booking._id,
  });

  res.status(201).json({
    success: true,
    message: "Đã điều phối thợ và tạo lịch đặt thành công",
    data: {
      booking: toResponse(booking),
      request: updatedRequest,
    },
  });
}

module.exports = {
  selectProvider,
  getAllBookingsForStaff,
  getMyProviderBookings,
  getMyCustomerBookings,
  getBookingById,
  confirmBooking,
  declineBooking,
  expirePendingBookings,
  updateServiceStatus,
  adjustBookingByStaff,
  confirmCustomerPayment,
  rescheduleCustomerBooking,
  cancelCustomerBooking,
  MAX_FINAL_PRICE_RATIO,
};
