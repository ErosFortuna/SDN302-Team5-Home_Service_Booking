'use client'

import { useApp, AppProvider } from '../app-store'
import { WebHeader } from './web-header'
import { WebLanding } from './web-landing'
import { CustomerBookingsView } from './customer-bookings-view'
import { ProviderSearchResults } from '../customer/provider-search-results'
import { ServiceDetailScreen } from '../customer/service-detail-screen'
import { ProviderProfileView } from '../customer/provider-profile-view'
import { CustomerProfileView } from '../customer/customer-profile-view'
import { WebChatView } from './web-chat-view'
import { ProviderPortalView } from './provider-portal-view'
import { BookingFlow } from '../customer/booking-flow'

import { JobDetail } from '../provider/job-detail'
import { WebChatBubble } from './web-chat-bubble'
import { StaffPortalView } from '../staff/staff-portal-view'
import { AdminPortalView } from '../admin/admin-portal-view'
import { WebAuthModal } from '../auth/web-auth-modal'
import { WebProfileModal } from '../profile/web-profile-modal'
import { UserConsentModal } from '../policy/user-consent-modal'
import { ProviderReviewModal } from './provider-review-modal'
import { ToastProvider } from '@/components/provider-booking/toast'

function WebAppContent() {
  const { role, customerTab, selectedProviderId, closeProviderProfile, openBookingFlow } = useApp()

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
            {customerTab === 'search' && <ProviderSearchResults />}
            {customerTab === 'service-detail' && <ServiceDetailScreen />}
            {customerTab === 'provider-profile' && selectedProviderId && (
              <ProviderProfileView
                providerId={selectedProviderId}
                onBack={closeProviderProfile}
                onBookService={(service) => openBookingFlow(
                  service.category?.name,
                  { ...service, isActive: true },
                )}
              />
            )}
            {customerTab === 'profile' && <CustomerProfileView />}
          </>
        )}

        {role === 'provider' && <ProviderPortalView />}

        {role === 'staff' && <StaffPortalView />}

        {role === 'admin' && <AdminPortalView />}
      </main>

      {/* Global Web Modals */}
      <BookingFlow />

      <JobDetail />
      <ProviderReviewModal />
      <WebAuthModal />
      <WebProfileModal />
      <UserConsentModal />

      {/* Floating Chat Bubble Widget */}
      <WebChatBubble />
    </div>
  )
}

export function WebAppShell() {
  return (
    <ToastProvider>
      <AppProvider>
        <WebAppContent />
      </AppProvider>
    </ToastProvider>
  )
}
