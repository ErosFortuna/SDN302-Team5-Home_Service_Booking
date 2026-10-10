'use client'

import { useApp, AppProvider } from '../app-store'
import { WebHeader } from './web-header'
import { WebLanding } from './web-landing'
import { CustomerBookingsView } from './customer-bookings-view'
import { ServiceSearchResults } from '../customer/service-search-results'
import { ServiceDetailScreen } from '../customer/service-detail-screen'
import { WebChatView } from './web-chat-view'
import { ProviderPortalView } from './provider-portal-view'
import { BookingFlow } from '../customer/booking-flow'
import { QuoteCompare } from '../customer/quote-compare'
import { QuoteSubmit } from '../provider/quote-submit'
import { JobDetail } from '../provider/job-detail'
import { WebChatBubble } from './web-chat-bubble'
import { StaffPortalView } from '../staff/staff-portal-view'
import { AdminPortalView } from '../admin/admin-portal-view'
import { WebAuthModal } from '../auth/web-auth-modal'
import { ProviderReviewModal } from './provider-review-modal'

function WebAppContent() {
  const { role, customerTab } = useApp()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Web Header Navbar */}
      <WebHeader />

      {/* Main Web Views according to Role */}
      <main className="flex-1">
        {role === 'customer' && (
          <>
            {customerTab === 'home' && <WebLanding />}
            {customerTab === 'bookings' && <CustomerBookingsView />}
            {customerTab === 'search' && <ServiceSearchResults />}
            {customerTab === 'service-detail' && <ServiceDetailScreen />}
          </>
        )}

        {role === 'provider' && <ProviderPortalView />}

        {role === 'staff' && <StaffPortalView />}

        {role === 'admin' && <AdminPortalView />}
      </main>

      {/* Global Web Modals */}
      <BookingFlow />
      <QuoteCompare />
      <QuoteSubmit />
      <JobDetail />
      <ProviderReviewModal />
      <WebAuthModal />

      {/* Floating Chat Bubble Widget */}
      <WebChatBubble />
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
