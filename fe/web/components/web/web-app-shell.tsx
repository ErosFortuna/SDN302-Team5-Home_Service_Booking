'use client'

import { useApp, AppProvider } from '../app-store'
import { WebHeader } from './web-header'
import { WebLanding } from './web-landing'
import { CustomerBookingsView } from './customer-bookings-view'
import { WebChatView } from './web-chat-view'
import { ProviderPortalView } from './provider-portal-view'
import { BookingFlow } from '../customer/booking-flow'
import { QuoteCompare } from '../customer/quote-compare'
import { QuoteSubmit } from '../provider/quote-submit'
import { JobDetail } from '../provider/job-detail'

function WebAppContent() {
  const { role, customerTab, providerTab } = useApp()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Web Header Navbar */}
      <WebHeader />

      {/* Main Web Views */}
      <main className="flex-1">
        {role === 'customer' ? (
          <>
            {customerTab === 'home' && <WebLanding />}
            {customerTab === 'bookings' && <CustomerBookingsView />}
            {customerTab === 'chat' && <WebChatView />}
          </>
        ) : (
          <>
            {(providerTab === 'dashboard' || providerTab === 'jobs') && (
              <ProviderPortalView />
            )}
            {providerTab === 'chat' && <WebChatView />}
          </>
        )}
      </main>

      {/* Global Web Modals */}
      <BookingFlow />
      <QuoteCompare />
      <QuoteSubmit />
      <JobDetail />
    </div>
  )
}

export function WebAppShell() {
  return (
    <AppProvider>
      <WebAppContent />
    </AppProvider>
  )
}
