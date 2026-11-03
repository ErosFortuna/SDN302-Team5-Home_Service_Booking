import { ProviderBookingDetailView } from '@/components/provider-booking/provider-booking-detail-view'

export default async function ProviderBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProviderBookingDetailView bookingId={id} />
}
