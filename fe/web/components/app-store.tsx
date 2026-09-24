'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  INITIAL_BOOKINGS,
  INITIAL_CHAT,
  JOB_REQUESTS,
} from '@/lib/data'
import type {
  Booking,
  BookingStatus,
  ChatMessage,
  Role,
  ServiceCategory,
} from '@/lib/types'

type Theme = 'light' | 'dark'
type CustomerTab = 'home' | 'bookings' | 'chat'
type ProviderTab = 'dashboard' | 'jobs' | 'chat'

interface NewBookingInput {
  category: ServiceCategory
  title: string
  description: string
  date: string
  time: string
  address: string
  budget: number
  photos: number
}

interface ProviderQuoteInput {
  laborFee: number
  materialFee: number
  arrival: string
}

interface AppState {
  role: Role
  setRole: (r: Role) => void
  theme: Theme
  toggleTheme: () => void

  customerTab: CustomerTab
  setCustomerTab: (t: CustomerTab) => void
  providerTab: ProviderTab
  setProviderTab: (t: ProviderTab) => void

  bookings: Booking[]
  jobRequests: Booking[]
  providerJobs: Booking[]
  quotedRequestIds: string[]

  chat: ChatMessage[]

  // customer overlays
  bookingFlowOpen: boolean
  openBookingFlow: (category?: ServiceCategory) => void
  closeBookingFlow: () => void
  presetCategory: ServiceCategory | null

  quoteBookingId: string | null
  openQuoteCompare: (id: string) => void
  closeQuoteCompare: () => void

  // provider overlays
  quoteRequestId: string | null
  openQuoteSubmit: (id: string) => void
  closeQuoteSubmit: () => void

  jobDetailId: string | null
  openJobDetail: (id: string) => void
  closeJobDetail: () => void

  // actions
  submitBooking: (input: NewBookingInput) => void
  acceptQuote: (bookingId: string, quoteId: string) => void
  declineQuote: (bookingId: string, quoteId: string) => void
  submitProviderQuote: (requestId: string, input: ProviderQuoteInput) => void
  updateJobStatus: (jobId: string, status: BookingStatus) => void
  sendMessage: (text: string) => void
}

const AppContext = createContext<AppState | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

let idCounter = 100
const nextId = (prefix: string) => `${prefix}${idCounter++}`

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('customer')
  const [theme, setTheme] = useState<Theme>('light')

  const [customerTab, setCustomerTab] = useState<CustomerTab>('home')
  const [providerTab, setProviderTab] = useState<ProviderTab>('dashboard')

  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS)
  const [jobRequests] = useState<Booking[]>(JOB_REQUESTS)
  const [quotedRequestIds, setQuotedRequestIds] = useState<string[]>([])
  const [providerJobs, setProviderJobs] = useState<Booking[]>([
    {
      ...INITIAL_BOOKINGS[1],
      id: 'pj1',
      customerName: 'Linh Pham',
      title: 'Deep clean 2-bedroom apartment',
    },
  ])

  const [chat, setChat] = useState<ChatMessage[]>(INITIAL_CHAT)

  const [bookingFlowOpen, setBookingFlowOpen] = useState(false)
  const [presetCategory, setPresetCategory] = useState<ServiceCategory | null>(
    null,
  )
  const [quoteBookingId, setQuoteBookingId] = useState<string | null>(null)
  const [quoteRequestId, setQuoteRequestId] = useState<string | null>(null)
  const [jobDetailId, setJobDetailId] = useState<string | null>(null)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  const value = useMemo<AppState>(() => {
    return {
      role,
      setRole,
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),

      customerTab,
      setCustomerTab,
      providerTab,
      setProviderTab,

      bookings,
      jobRequests,
      providerJobs,
      quotedRequestIds,
      chat,

      bookingFlowOpen,
      openBookingFlow: (category) => {
        setPresetCategory(category ?? null)
        setBookingFlowOpen(true)
      },
      closeBookingFlow: () => setBookingFlowOpen(false),
      presetCategory,

      quoteBookingId,
      openQuoteCompare: (id) => setQuoteBookingId(id),
      closeQuoteCompare: () => setQuoteBookingId(null),

      quoteRequestId,
      openQuoteSubmit: (id) => setQuoteRequestId(id),
      closeQuoteSubmit: () => setQuoteRequestId(null),

      jobDetailId,
      openJobDetail: (id) => setJobDetailId(id),
      closeJobDetail: () => setJobDetailId(null),

      submitBooking: (input) => {
        const booking: Booking = {
          id: nextId('b'),
          ...input,
          status: 'pending',
          createdAt: 'Just now',
          customerName: 'You',
          distanceKm: 2.0,
          quotes: [],
        }
        setBookings((prev) => [booking, ...prev])
        setBookingFlowOpen(false)
        setCustomerTab('bookings')
      },

      acceptQuote: (bookingId, quoteId) => {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? { ...b, status: 'in_progress', acceptedQuoteId: quoteId }
              : b,
          ),
        )
        setQuoteBookingId(null)
        setCustomerTab('bookings')
      },

      declineQuote: (bookingId, quoteId) => {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId
              ? { ...b, quotes: b.quotes.filter((q) => q.id !== quoteId) }
              : b,
          ),
        )
      },

      submitProviderQuote: (requestId, input) => {
        setQuotedRequestIds((prev) =>
          prev.includes(requestId) ? prev : [...prev, requestId],
        )
        setChat((prev) => [
          ...prev,
          {
            id: nextId('m'),
            from: 'me',
            time: 'Now',
            quote: input,
          },
        ])
        setQuoteRequestId(null)
      },

      updateJobStatus: (jobId, status) => {
        setProviderJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status } : j)),
        )
      },

      sendMessage: (text) => {
        setChat((prev) => [
          ...prev,
          {
            id: nextId('m'),
            from: 'me',
            text,
            time: 'Now',
          },
        ])
        // Simulate a reply
        setTimeout(() => {
          setChat((prev) => [
            ...prev,
            {
              id: nextId('m'),
              from: 'them',
              text: 'Great, thanks for confirming! See you then.',
              time: 'Now',
            },
          ])
        }, 1200)
      },
    }
  }, [
    role,
    theme,
    customerTab,
    providerTab,
    bookings,
    jobRequests,
    providerJobs,
    quotedRequestIds,
    chat,
    bookingFlowOpen,
    presetCategory,
    quoteBookingId,
    quoteRequestId,
    jobDetailId,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
