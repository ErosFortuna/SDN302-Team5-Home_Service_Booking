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
  INITIAL_USERS,
  INITIAL_COMPLAINTS,
  INITIAL_VERIFICATIONS,
  INITIAL_POLICIES,
} from '@/lib/data'
import type {
  Booking,
  BookingStatus,
  ChatMessage,
  Role,
  ServiceCategory,
  UserAccount,
  Complain,
  Policy,
  ProviderVerification,
} from '@/lib/types'
import { getCurrentUser, toUserAccount } from '@/lib/auth'

type Theme = 'light' | 'dark'
export type CustomerTab = 'home' | 'bookings'
export type ProviderTab = 'dashboard' | 'jobs' | 'availability' | 'skills' | 'complaints'
export type StaffTab = 'complaints' | 'verifications' | 'schedule' | 'reports'
export type AdminTab = 'dashboard' | 'users' | 'verifications' | 'policies' | 'categories' | 'reviews'

export type AuthMode = 'login' | 'register_customer' | 'register_provider' | 'verify_email'

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

  // Auth & Current User
  currentUser: UserAccount | null
  setCurrentUser: (u: UserAccount | null) => void
  accessToken: string | null
  isLoggedIn: boolean
  authModalOpen: boolean
  openAuthModal: (mode?: AuthMode) => void
  closeAuthModal: () => void
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void

  login: (user: UserAccount, accessToken: string) => void
  logout: () => void

  // Navigation tabs for each role
  customerTab: CustomerTab
  setCustomerTab: (t: CustomerTab) => void
  providerTab: ProviderTab
  setProviderTab: (t: ProviderTab) => void
  staffTab: StaffTab
  setStaffTab: (t: StaffTab) => void
  adminTab: AdminTab
  setAdminTab: (t: AdminTab) => void

  // Core Booking & Chat
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

  // Chat bubble state
  chatBubbleOpen: boolean
  setChatBubbleOpen: (open: boolean) => void
  toggleChatBubble: () => void
  openChatBubble: (partnerId?: string) => void
  activePartnerId: string
  setActivePartnerId: (id: string) => void
  chatBubbleExpanded: boolean
  setChatBubbleExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void

  // Use Case features (Staff & Admin)
  usersList: UserAccount[]
  complaints: Complain[]
  resolveComplain: (id: string, resolution: string, refund?: number) => void
  verifications: ProviderVerification[]
  approveVerification: (id: string) => void
  rejectVerification: (id: string) => void
  policies: Policy[]
  createPolicy: (policy: Omit<Policy, 'id'>) => void
  deletePolicy: (id: string) => void
  cancelOrRescheduleBooking: (
    bookingId: string,
    action: 'cancel' | 'reschedule',
    newDate?: string,
  ) => void

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
  // Auth state: Default to customer
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('customer')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  // Tabs for each role
  const [customerTab, setCustomerTab] = useState<CustomerTab>('home')
  const [providerTab, setProviderTab] = useState<ProviderTab>('dashboard')
  const [staffTab, setStaffTab] = useState<StaffTab>('complaints')
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard')

  // Data
  const [usersList, setUsersList] = useState<UserAccount[]>(INITIAL_USERS)
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
  const [complaints, setComplaints] = useState<Complain[]>(INITIAL_COMPLAINTS)
  const [verifications, setVerifications] = useState<ProviderVerification[]>(
    INITIAL_VERIFICATIONS,
  )
  const [policies, setPolicies] = useState<Policy[]>(INITIAL_POLICIES)

  // Overlays
  const [bookingFlowOpen, setBookingFlowOpen] = useState(false)
  const [presetCategory, setPresetCategory] = useState<ServiceCategory | null>(
    null,
  )
  const [quoteBookingId, setQuoteBookingId] = useState<string | null>(null)
  const [quoteRequestId, setQuoteRequestId] = useState<string | null>(null)
  const [jobDetailId, setJobDetailId] = useState<string | null>(null)

  // Chat bubble
  const [chatBubbleOpen, setChatBubbleOpen] = useState(false)
  const [activePartnerId, setActivePartnerId] = useState('aquafix')
  const [chatBubbleExpanded, setChatBubbleExpanded] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  const login = (user: UserAccount, token: string) => {
    setCurrentUser(user)
    setRole(user.role)
    setAccessToken(token)
    setIsLoggedIn(true)
    try {
      window.localStorage.setItem('hsb_access_token', token)
    } catch {
      // Session remains available in memory when browser storage is unavailable.
    }

    if (user.role === 'customer') setCustomerTab('home')
    else if (user.role === 'provider') setProviderTab('dashboard')
    else if (user.role === 'staff') setStaffTab('complaints')
    else if (user.role === 'admin') setAdminTab('dashboard')

    setAuthModalOpen(false)
  }

  const logout = () => {
    setIsLoggedIn(false)
    setCurrentUser(null)
    setAccessToken(null)
    setRole('customer')
    setCustomerTab('home')
    try {
      window.localStorage.removeItem('hsb_access_token')
    } catch {
      // Ignore unavailable browser storage.
    }
  }

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      let token: string | null = null
      try {
        token = window.localStorage.getItem('hsb_access_token')
      } catch {
        return
      }
      if (!token) return

      try {
        const user = toUserAccount(await getCurrentUser(token))
        if (active) login(user, token)
      } catch {
        try {
          window.localStorage.removeItem('hsb_access_token')
        } catch {
          // Ignore unavailable browser storage.
        }
      }
    }

    void restoreSession()
    return () => {
      active = false
    }
  }, [])

  const resolveComplain = (id: string, resolution: string, refund?: number) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'resolved',
              resolution,
              refundAmount: refund,
            }
          : c,
      ),
    )
  }

  const approveVerification = (id: string) => {
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'approved' } : v)),
    )
  }

  const rejectVerification = (id: string) => {
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'rejected' } : v)),
    )
  }

  const createPolicy = (policyData: Omit<Policy, 'id'>) => {
    const newPol: Policy = {
      id: nextId('pol-'),
      ...policyData,
    }
    setPolicies((prev) => [newPol, ...prev])
  }

  const deletePolicy = (id: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== id))
  }

  const cancelOrRescheduleBooking = (
    bookingId: string,
    action: 'cancel' | 'reschedule',
    newDate?: string,
  ) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          if (action === 'cancel') return { ...b, status: 'cancelled' }
          if (action === 'reschedule' && newDate) return { ...b, date: newDate }
        }
        return b
      }),
    )
  }

  const value = useMemo<AppState>(() => {
    return {
      role,
      setRole: (r) => {
        setRole(r)
        // Auto-navigate to respective default tab
        if (r === 'customer') setCustomerTab('home')
        else if (r === 'provider') setProviderTab('dashboard')
        else if (r === 'staff') setStaffTab('complaints')
        else if (r === 'admin') setAdminTab('dashboard')
      },
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),

      currentUser,
      setCurrentUser,
      accessToken,
      isLoggedIn,
      authModalOpen,
      openAuthModal: (mode = 'login') => {
        setAuthMode(mode)
        setAuthModalOpen(true)
      },
      closeAuthModal: () => setAuthModalOpen(false),
      authMode,
      setAuthMode,
      login,
      logout,

      customerTab,
      setCustomerTab,
      providerTab,
      setProviderTab,
      staffTab,
      setStaffTab,
      adminTab,
      setAdminTab,

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

      // Chat bubble
      chatBubbleOpen,
      setChatBubbleOpen,
      toggleChatBubble: () => setChatBubbleOpen((prev) => !prev),
      openChatBubble: (partnerId) => {
        if (partnerId) setActivePartnerId(partnerId)
        setChatBubbleOpen(true)
      },
      activePartnerId,
      setActivePartnerId,
      chatBubbleExpanded,
      setChatBubbleExpanded,

      // Use Case features
      usersList,
      complaints,
      resolveComplain,
      verifications,
      approveVerification,
      rejectVerification,
      policies,
      createPolicy,
      deletePolicy,
      cancelOrRescheduleBooking,

      submitBooking: (input) => {
        const booking: Booking = {
          id: nextId('b'),
          ...input,
          status: 'pending',
          createdAt: 'Just now',
          customerName: currentUser?.name || 'You',
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
              text: 'Dạ vâng, tôi đã nhận thông tin và sẽ chuẩn bị đồ nghề đầy đủ!',
              time: 'Now',
            },
          ])
        }, 1200)
      },
    }
  }, [
    role,
    theme,
    currentUser,
    accessToken,
    isLoggedIn,
    authModalOpen,
    authMode,
    customerTab,
    providerTab,
    staffTab,
    adminTab,
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
    chatBubbleOpen,
    activePartnerId,
    chatBubbleExpanded,
    usersList,
    complaints,
    verifications,
    policies,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
