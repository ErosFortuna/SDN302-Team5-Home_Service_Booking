import { AppError } from "../../shared/app-error.js";

/**
 * Booking lifecycle (UC-38 Update Service Status).
 *
 * Provider-driven transitions:
 *   CONFIRMED           → PROVIDER_ON_THE_WAY | IN_PROGRESS
 *   PROVIDER_ON_THE_WAY → ARRIVED | IN_PROGRESS
 *   ARRIVED             → IN_PROGRESS
 *   IN_PROGRESS         → AWAITING_APPROVAL (has pending extra costs) | COMPLETED
 *
 * Customer-driven transition:
 *   AWAITING_APPROVAL   → IN_PROGRESS (after approving / rejecting extra costs)
 */
export const BOOKING_STATUS = Object.freeze({
  PENDING_CONFIRMATION: "PENDING_CONFIRMATION",
  CONFIRMED: "CONFIRMED",
  PROVIDER_ON_THE_WAY: "PROVIDER_ON_THE_WAY",
  ARRIVED: "ARRIVED",
  IN_PROGRESS: "IN_PROGRESS",
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
});
export const BOOKING_STATUS_VALUES = Object.values(BOOKING_STATUS);

export const MATERIAL_APPROVAL = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
});
export const MATERIAL_APPROVAL_VALUES = Object.values(MATERIAL_APPROVAL);

const S = BOOKING_STATUS;

/** Transitions a PROVIDER may trigger through PATCH /bookings/:id/status. */
export const PROVIDER_TRANSITIONS = Object.freeze({
  [S.CONFIRMED]: [S.PROVIDER_ON_THE_WAY, S.IN_PROGRESS],
  [S.PROVIDER_ON_THE_WAY]: [S.ARRIVED, S.IN_PROGRESS],
  [S.ARRIVED]: [S.IN_PROGRESS],
  [S.IN_PROGRESS]: [S.AWAITING_APPROVAL, S.COMPLETED],
});

export const getAllowedProviderTransitions = (status) =>
  PROVIDER_TRANSITIONS[status] ?? [];

export const countMaterialsByStatus = (materials = [], approvalStatus) =>
  materials.filter((m) => m.approvalStatus === approvalStatus).length;

export const sumMaterials = (materials = [], approvalStatus) =>
  materials
    .filter((m) => m.approvalStatus === approvalStatus)
    .reduce((total, m) => total + m.quantity * m.price, 0);

/**
 * State-machine guard. Throws an AppError when the provider tries an
 * illegal jump (e.g. CONFIRMED → COMPLETED) or breaks a business rule.
 */
export function assertProviderTransition(booking, nextStatus, { confirmCompletion } = {}) {
  const from = booking.status;

  if (from === nextStatus) {
    throw new AppError(409, `Booking is already ${from}`);
  }

  const allowed = getAllowedProviderTransitions(from);
  if (!allowed.includes(nextStatus)) {
    throw new AppError(422, `Invalid status transition: ${from} -> ${nextStatus}`, {
      from,
      to: nextStatus,
      allowed,
    });
  }

  const pending = countMaterialsByStatus(booking.materials, MATERIAL_APPROVAL.PENDING);

  if (nextStatus === S.AWAITING_APPROVAL && pending === 0) {
    throw new AppError(422, "There are no pending materials/fees to submit for customer approval");
  }

  if (nextStatus === S.COMPLETED) {
    if (pending > 0) {
      throw new AppError(
        422,
        `Cannot complete: ${pending} material/fee item(s) are still pending customer approval`,
      );
    }
    if (confirmCompletion !== true) {
      throw new AppError(422, "Completion must be explicitly confirmed (confirmCompletion: true)");
    }
  }
}
