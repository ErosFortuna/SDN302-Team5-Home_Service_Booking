import { ProviderProfileView } from '@/components/customer/provider-profile-view'
import { WebHeader } from '@/components/web/web-header'

export default async function ProviderPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <WebHeader />
      <main className="flex-1">
        <ProviderProfileView providerId={id} />
      </main>
    </div>
  )
}

