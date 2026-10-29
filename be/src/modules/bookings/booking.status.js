const { AppError } = require('../../shared/app-error.js');

/**
 * Booking lifecycle (UC-38 Update Service Status & Provider Confirm/Decline).
 *
 * Provider-driven transitions:
 *   PENDING_CONFIRMATION → CONFIRMED | CANCELLED (via dedicated confirm / decline endpoints)
 *   CONFIRMED            → PROVIDER_ON_THE_WAY | IN_PROGRESS
 *   PROVIDER_ON_THE_WAY  → ARRIVED | IN_PROGRESS
 *   ARRIVED              → IN_PROGRESS
 *   IN_PROGRESS          → AWAITING_APPROVAL (has pending extra costs) | COMPLETED
 *
 * Customer-driven transition:
 *   AWAITING_APPROVAL    → IN_PROGRESS (after approving / rejecting extra costs)
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

const MATERIAL_APPROVAL = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});
const MATERIAL_APPROVAL_VALUES = Object.values(MATERIAL_APPROVAL);

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
  [S.IN_PROGRESS]: [S.AWAITING_APPROVAL, S.COMPLETED],
});

const getAllowedProviderTransitions = (status) => PROVIDER_TRANSITIONS[status] || [];

const countMaterialsByStatus = (materials = [], approvalStatus) =>
  materials.filter((m) => m.approvalStatus === approvalStatus).length;

const sumMaterials = (materials = [], approvalStatus) =>
  materials
    .filter((m) => m.approvalStatus === approvalStatus)
    .reduce((total, m) => total + m.quantity * m.price, 0);

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

  const pending = countMaterialsByStatus(booking.materials, MATERIAL_APPROVAL.PENDING);

  if (nextStatus === S.AWAITING_APPROVAL && pending === 0) {
    throw new AppError(422, 'There are no pending materials/fees to submit for customer approval');
  }

  if (nextStatus === S.COMPLETED) {
    if (pending > 0) {
      throw new AppError(422, `Cannot complete: ${pending} material/fee item(s) are still pending customer approval`);
    }
    if (confirmCompletion !== true) {
      throw new AppError(422, 'Completion must be explicitly confirmed (confirmCompletion: true)');
    }
  }
}

module.exports = {
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  DECLINE_REASON,
  DECLINE_REASON_VALUES,
  BOOKING_RESPONSE_TIMEOUT_HOURS,
  MATERIAL_APPROVAL,
  MATERIAL_APPROVAL_VALUES,
  PROVIDER_TRANSITIONS,
  getAllowedProviderTransitions,
  countMaterialsByStatus,
  sumMaterials,
  assertProviderTransition,
};
