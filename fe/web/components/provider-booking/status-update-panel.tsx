'use client'

import type { ProviderBooking, StatusUpdatePayload } from '@/lib/api/bookings'
import { JobProgressChecklist } from './job-progress-checklist'

interface Props {
  booking: ProviderBooking
  pendingAction: string | null
  onUpdateStatus: (payload: StatusUpdatePayload) => Promise<boolean>
  onConfirm?: () => Promise<boolean>
  onDecline?: (reasonCode: string, note?: string) => Promise<boolean>
}

export function StatusUpdatePanel({
  booking,
  pendingAction,
  onUpdateStatus,
  onConfirm,
  onDecline,
}: Props) {
  return (
    <JobProgressChecklist
      jobId={booking.id}
      rawStatus={booking.status}
      allowedTransitions={booking.allowedTransitions}
      scheduledStartAt={booking.scheduledStartAt}
      scheduledEndAt={booking.scheduledEndAt}
      address={booking.address}
      customerName={booking.customer?.fullName}
      customerPhone={booking.customer?.phone}
      serviceName={booking.service?.name}
      price={booking.price}
      finalPrice={booking.finalPrice}
      completionNote={booking.completionNote}
      proofPhotos={booking.proofPhotos || booking.progressPhotos || []}
      onConfirm={onConfirm}
      onDecline={onDecline}
      onUpdateStatus={onUpdateStatus}
      isBusy={pendingAction !== null}
      pendingAction={pendingAction}
    />
  )
}
