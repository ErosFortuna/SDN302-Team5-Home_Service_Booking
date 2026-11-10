const { AppError } = require('../../shared/app-error.js');

/**
 * Booking lifecycle (UC-38 Update Service Status & Provider Confirm/Decline).
 *
 * Provider-driven transitions:
 *   PENDING_CONFIRMATION → CONFIRMED | CANCELLED (via dedicated confirm / decline endpoints)
 *   CONFIRMED            → PROVIDER_ON_THE_WAY | IN_PROGRESS
 *   PROVIDER_ON_THE_WAY  → ARRIVED | IN_PROGRESS
 *   ARRIVED              → IN_PROGRESS
 *   IN_PROGRESS          → COMPLETED
 *
 * AWAITING_APPROVAL remains a legacy status for old records and can return to
 * IN_PROGRESS; new bookings never enter that state.
 */
const BOOKING_STATUS = Object.freeze({
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  PROVIDER_ON_THE_WAY: 'PROVIDER_ON_THE_WAY',
  ARRIVED: 'ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
});
const BOOKING_STATUS_VALUES = Object.values(BOOKING_STATUS);

/**
 * Trạng thái booking còn hiệu lực (chưa bị hủy / từ chối / hết hạn / hoàn thành).
 * Dùng cho partial unique index trên (provider, scheduledStartAt) và kiểm tra overlap.
 */
const ACTIVE_BOOKING_STATUSES = Object.freeze([
  BOOKING_STATUS.PENDING_CONFIRMATION,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.PROVIDER_ON_THE_WAY,
  BOOKING_STATUS.ARRIVED,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.AWAITING_APPROVAL,
]);

const DECLINE_REASON = Object.freeze({
  BUSY: 'BUSY',
  TOO_FAR: 'TOO_FAR',
  OUT_OF_SKILL: 'OUT_OF_SKILL',
  PRICE_ISSUE: 'PRICE_ISSUE',
  OTHER: 'OTHER',
  NO_RESPONSE: 'NO_RESPONSE',
});
const DECLINE_REASON_VALUES = Object.values(DECLINE_REASON);

const BOOKING_RESPONSE_TIMEOUT_HOURS = 12;

/**
 * Giả định nghiệp vụ (Business Assumption):
 * Giá cuối cùng (finalPrice) do thợ (PROVIDER) cập nhật khi hoàn thành công việc
 * không được vượt quá 150% (tỉ lệ 1.5) so với giá dịch vụ đã thoả thuận ban đầu (booking.price).
 * Mọi trường hợp phát sinh vượt ngưỡng này cần có sự can thiệp hoặc điều chỉnh của STAFF/ADMIN.
 */
const MAX_FINAL_PRICE_RATIO = 100000;

const S = BOOKING_STATUS;

/**
 * Transitions a PROVIDER may legally trigger.
 * PENDING_CONFIRMATION -> CONFIRMED | CANCELLED must go through dedicated endpoints
 * (confirmBooking / declineBooking) to enforce schedule guards & cancellation transactions.
 */
const PROVIDER_TRANSITIONS = Object.freeze({
  [S.PENDING_CONFIRMATION]: [S.CONFIRMED, S.CANCELLED],
  [S.CONFIRMED]: [S.PROVIDER_ON_THE_WAY, S.IN_PROGRESS],
  [S.PROVIDER_ON_THE_WAY]: [S.ARRIVED, S.IN_PROGRESS],
  [S.ARRIVED]: [S.IN_PROGRESS],
  [S.IN_PROGRESS]: [S.COMPLETED],
  [S.AWAITING_APPROVAL]: [S.IN_PROGRESS],
});

const getAllowedProviderTransitions = (status) => PROVIDER_TRANSITIONS[status] || [];

/**
 * State-machine guard (NFR-05). Throws an AppError when the provider tries an
 * illegal jump (e.g. CONFIRMED → COMPLETED) or breaks a business rule.
 *
 * @param {object} booking
 * @param {string} nextStatus
 * @param {object} options
 * @param {boolean} [options.confirmCompletion]
 * @param {boolean} [options.isDedicatedEndpoint] - true if called from confirmBooking / declineBooking
 * @param {string} [options.reasonCode] - required when declining from PENDING_CONFIRMATION
 */
function assertProviderTransition(
  booking,
  nextStatus,
  { confirmCompletion, isDedicatedEndpoint = false, reasonCode } = {}
) {
  const from = booking.status;

  if (from === nextStatus) {
    throw new AppError(409, `Booking is already ${from}`);
  }

  // Prevent generic updateServiceStatus from bypassing confirm/decline endpoints:
  if (from === S.PENDING_CONFIRMATION && !isDedicatedEndpoint) {
    throw new AppError(422, `Invalid status transition: ${from} -> ${nextStatus}`);
  }

  if (!isDedicatedEndpoint && (nextStatus === S.CONFIRMED || nextStatus === S.CANCELLED)) {
    throw new AppError(422, `Invalid status transition: ${from} -> ${nextStatus}`);
  }

  const allowed = getAllowedProviderTransitions(from);
  if (!allowed.includes(nextStatus)) {
    throw new AppError(422, `Invalid status transition: ${from} -> ${nextStatus}`, {
      from,
      to: nextStatus,
      allowed,
    });
  }

  // When declining a pending confirmation booking, reasonCode is mandatory
  if (from === S.PENDING_CONFIRMATION && nextStatus === S.CANCELLED && !reasonCode) {
    throw new AppError(422, 'reasonCode is required when declining a pending booking');
  }

  if (nextStatus === S.COMPLETED) {
    if (confirmCompletion !== true) {
      throw new AppError(422, 'Completion must be explicitly confirmed (confirmCompletion: true)');
    }
  }
}

module.exports = {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  ACTIVE_BOOKING_STATUSES,
  DECLINE_REASON,
  DECLINE_REASON_VALUES,
  BOOKING_RESPONSE_TIMEOUT_HOURS,
  MAX_FINAL_PRICE_RATIO,
  PROVIDER_TRANSITIONS,
  getAllowedProviderTransitions,
  assertProviderTransition,
};
