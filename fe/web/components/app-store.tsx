'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type {
  Booking,
  BookingStatus,
  ChatMessage,
  Role,
  ServiceCategory,
  UserAccount,
  Complain,
  ProviderVerification,
  ServiceCategoryItem,
  ServiceItem,
  NewBookingInput,
} from '@/lib/types'
import { getCurrentUser, toUserAccount, updateCurrentUser } from '@/lib/auth'
import { buildApiUrl } from '@/lib/api/base-url'
import {
  getActiveServices,
  getMyServiceRequests,
  getDispatchRequests,
  postCreateServiceRequest,
  buildServiceRequestPayload,
  parseRequestTitleAndDesc,
  type BackendService,
} from '@/lib/api/service-requests'
import { setStoredToken, removeStoredToken, apiRequest, authStorage } from '@/lib/api/client'
import { bookingApi } from '@/lib/api/bookings'
import { complaintApi } from '@/lib/api/complaints'
import { providerVerificationApi } from '@/lib/api/verification'
import { dateTimeLocalToIso, formatVietnamDate, formatVietnamTime, vietnamWallClockToIso } from '@/lib/timezone'

type Theme = 'light' | 'dark'
export type CustomerTab = 'home' | 'bookings' | 'search' | 'service-detail' | 'provider-profile' | 'profile'
export type ProviderTab = 'dashboard' | 'jobs' | 'profile' | 'availability' | 'skills' | 'membership' | 'complaints' | 'reviews'
export type StaffTab = 'complaints' | 'verifications' | 'dispatch' | 'schedule' | 'reports'
export type AdminTab = 'dashboard' | 'reports' | 'users' | 'providers' | 'categories' | 'services' | 'reviews' | 'policies'

export type AuthMode = 'login' | 'register_customer' | 'register_provider' | 'verify_email' | 'forgot_password'

export interface SelectedProviderPreset {
  id: string
  name: string
  businessName?: string
  avatarUrl?: string
  category?: string
}

interface AppState {
  role: Role
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

  // Profile modal
  profileModalOpen: boolean
  openProfileModal: () => void
  closeProfileModal: () => void
  updateUserProfile: (data: { name?: string; phone?: string; address?: string; currentPassword?: string }) => Promise<void>

  login: (user: UserAccount, accessToken: string) => void
  logout: () => void

  // Navigation tabs for each role
  customerTab: CustomerTab
  setCustomerTab: (t: CustomerTab) => void
  serviceSearchKeyword: string
  serviceSearchCategoryId: string
  openServiceSearch: (keyword?: string, categoryId?: string) => void
  selectedServiceId: string | null
  openServiceDetail: (serviceId: string) => void
  selectedProviderId: string | null
  openProviderProfile: (providerId: string) => void
  closeProviderProfile: () => void
  focusedBookingId: string | null
  focusBooking: (bookingId: string) => void
  clearFocusedBooking: () => void
  focusedRequestId: string | null
  focusRequest: (requestId: string) => void
  clearFocusedRequest: () => void
  focusedVerificationId: string | null
  focusVerification: (verificationId: string) => void
  clearFocusedVerification: () => void
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
  chat: ChatMessage[]

  // customer overlays
  bookingFlowOpen: boolean
  openBookingFlow: (
    category?: ServiceCategory,
    service?: ServiceItem,
    provider?: SelectedProviderPreset,
  ) => void
  closeBookingFlow: () => void
  presetCategory: ServiceCategory | null
  presetService: ServiceItem | null
  presetProvider: SelectedProviderPreset | null

  // provider overlays
  providerReviewId: string | null
  openProviderReview: (id: string) => void
  closeProviderReview: () => void

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
  resolveComplain: (id: string, resolution: string) => Promise<void> | void
  verifications: ProviderVerification[]
  approveVerification: (id: string) => Promise<void> | void
  rejectVerification: (id: string) => Promise<void> | void
  serviceCategories: ServiceCategoryItem[]
  serviceCategoriesLoading: boolean
  serviceCategoriesError: string | null
  backendServices: BackendService[]
  cancelOrRescheduleBooking: (
    bookingId: string,
    action: 'cancel' | 'reschedule',
    newDate?: string,
  ) => Promise<void> | void

  // actions
  loadUserBookings: (r: Role) => Promise<void>
  submitBooking: (input: NewBookingInput) => Promise<Booking>
  updateJobStatus: (jobId: string, status: BookingStatus | string, note?: string, photos?: string[], finalPrice?: number) => Promise<void> | void
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

  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const openProfileModal = () => setProfileModalOpen(true)
  const closeProfileModal = () => setProfileModalOpen(false)

  // Tabs for each role
  const [customerTab, setCustomerTab] = useState<CustomerTab>('home')
  const [serviceSearchKeyword, setServiceSearchKeyword] = useState('')
  const [serviceSearchCategoryId, setServiceSearchCategoryId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [providerProfileReturnTab, setProviderProfileReturnTab] = useState<CustomerTab>('home')
  const [focusedBookingId, setFocusedBookingId] = useState<string | null>(null)
  const [focusedRequestId, setFocusedRequestId] = useState<string | null>(null)
  const [focusedVerificationId, setFocusedVerificationId] = useState<string | null>(null)
  const [providerTab, setProviderTab] = useState<ProviderTab>('dashboard')
  const [staffTab, setStaffTab] = useState<StaffTab>('complaints')
  const [adminTab, setAdminTabState] = useState<AdminTab>('dashboard')

  const switchAdminTab = (t: AdminTab) => {
    setAdminTabState(t)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (t === 'dashboard') {
        url.searchParams.delete('adminTab')
      } else {
        url.searchParams.set('adminTab', t)
      }
      window.history.pushState(null, '', url.pathname + url.search)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const validTabs: AdminTab[] = ['dashboard', 'reports', 'users', 'providers', 'categories', 'services', 'reviews', 'policies']
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('adminTab') as AdminTab | null
    if (tabParam && validTabs.includes(tabParam)) {
      setAdminTabState(tabParam)
    }

    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search)
      const t = p.get('adminTab') as AdminTab | null
      if (t && validTabs.includes(t)) {
        setAdminTabState(t)
      } else {
        setAdminTabState('dashboard')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Data
  const [usersList, setUsersList] = useState<UserAccount[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [jobRequests, setJobRequests] = useState<Booking[]>([])
  const [providerJobs, setProviderJobs] = useState<Booking[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [complaints, setComplaints] = useState<Complain[]>([])
  const [verifications, setVerifications] = useState<ProviderVerification[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategoryItem[]>([])
  const [serviceCategoriesLoading, setServiceCategoriesLoading] = useState(true)
  const [serviceCategoriesError, setServiceCategoriesError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const loadServiceCategories = async () => {
      try {
        const response = await fetch(
          buildApiUrl('/service-categories'),
          { signal: controller.signal },
        )
        if (!response.ok) throw new Error('Could not load service categories')
        const result: { success?: boolean; data?: ServiceCategoryItem[] } =
          await response.json()
        if (!result.success || !Array.isArray(result.data)) {
          throw new Error('Invalid service categories response')
        }

        setServiceCategories(result.data.filter((category) => category.isActive))
      } catch (error) {
        if (controller.signal.aborted) return
        const message =
          error instanceof Error ? error.message : 'Could not load service categories'
        setServiceCategoriesError(message)
        console.warn('Could not load service categories:', error)
      } finally {
        if (!controller.signal.aborted) setServiceCategoriesLoading(false)
      }
    }

    void loadServiceCategories()
    return () => controller.abort()
  }, [])

  // Overlays
  const [bookingFlowOpen, setBookingFlowOpen] = useState(false)
  const [presetCategory, setPresetCategory] = useState<ServiceCategory | null>(
    null,
  )
  const [presetService, setPresetService] = useState<ServiceItem | null>(null)
  const [presetProvider, setPresetProvider] = useState<SelectedProviderPreset | null>(null)
  const [providerReviewId, setProviderReviewId] = useState<string | null>(null)
  const [jobDetailId, setJobDetailId] = useState<string | null>(null)

  // Chat bubble
  const [chatBubbleOpen, setChatBubbleOpen] = useState(false)
  const [activePartnerId, setActivePartnerId] = useState('support')
  const [chatBubbleExpanded, setChatBubbleExpanded] = useState(false)

  // Backend integration state
  const [backendServices, setBackendServices] = useState<BackendService[]>([])

  useEffect(() => {
    getActiveServices()
      .then((list) => {
        if (list && list.length > 0) setBackendServices(list)
      })
      .catch((err) => console.warn('Could not fetch backend services:', err))
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  const loadUserBookings = async (targetRole: Role) => {
    if (targetRole === 'customer') {
      try {
        const [reqs, bookingsRes] = await Promise.all([
          getMyServiceRequests().catch(() => []),
          bookingApi.listCustomerMine().catch(() => ({ success: true, data: [] })),
        ])

        const combined: Booking[] = []

        // 1. Map existing actual bookings
        if (bookingsRes?.success && Array.isArray(bookingsRes.data)) {
          for (const b of bookingsRes.data) {
            const rawDesc = (b as any).request?.description || (b as any).notes || ''
            const serviceName = (b.service as any)?.name || 'Đơn dịch vụ'
            const parsed = parseRequestTitleAndDesc(rawDesc, serviceName)

            combined.push({
              id: b.id || (b as any)._id,
              category: b.service?.category?.name || 'Chưa phân loại',
              categorySlug: b.service?.category?.slug,
              categoryIcon: b.service?.category?.icon,
              title: parsed.title,
              description: parsed.description || (b as any).completionNote || (b as any).notes || '',
              status: (String(b.status || '').toUpperCase() === 'COMPLETED' ? 'completed' : String(b.status || '').toUpperCase() === 'CANCELLED' ? 'cancelled' : ['IN_PROGRESS', 'PROVIDER_ON_THE_WAY', 'ARRIVED'].includes(String(b.status || '').toUpperCase()) ? 'in_progress' : 'pending') as BookingStatus,
              rawStatus: b.status,
              date: b.scheduledStartAt ? formatVietnamDate(b.scheduledStartAt) : '',
              time: b.scheduledStartAt ? formatVietnamTime(b.scheduledStartAt) : '',
              address: typeof b.address === 'string' ? b.address : ((b.address as any)?.addressLine || 'Đà Nẵng'),
              budget: (b as any).totalAmount || b.price || 0,
              photos: 0,
              createdAt: 'Vừa xong',
              customerName: (b as any).customer?.fullName || 'Bạn',
              distanceKm: typeof (b as any).distanceKm === 'number' ? (b as any).distanceKm : undefined,
              providerId: (b as any).provider?._id || (b as any).provider?.id,
              providerName: (b as any).provider?.fullName,
              providerPhone: (b as any).provider?.phone,
              providerAvatar: (b as any).provider?.avatarUrl,
              requestId: (b as any).request?._id || (b as any).request?.id || (b as any).request,
              isOpenRequest: false,
            })
          }
        }

        // 2. Map OPEN requests (not yet converted into bookings)
        const bookedRequestIds = new Set(combined.map((b) => b.requestId).filter(Boolean))
        if (reqs && reqs.length > 0) {
          for (const r of reqs as any[]) {
            const reqId = r.id || r._id
            if (!bookedRequestIds.has(reqId) && r.status === 'OPEN') {
              const serviceName = typeof r.service === 'object' && r.service?.name ? r.service.name : undefined
              const parsed = parseRequestTitleAndDesc(r.description, serviceName)

              combined.push({
                id: reqId,
                category: (typeof r.service === 'object' && r.service?.category?.name ? r.service.category.name : 'Chưa phân loại') as any,
                categorySlug: typeof r.service === 'object' ? r.service?.category?.slug : undefined,
                title: parsed.title,
                description: parsed.description || r.description || '',
                status: 'pending',
                date: r.preferredStartAt ? formatVietnamDate(r.preferredStartAt) : '',
                time: r.preferredStartAt ? formatVietnamTime(r.preferredStartAt) : '',
                address: r.address?.addressLine || 'Đà Nẵng',
                budget: r.budgetMax || r.budgetMin || 0,
                photos: r.attachments?.length || 0,
                createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
                customerName: 'Bạn',
                distanceKm: undefined,
                requestId: reqId,
                isOpenRequest: true,
              })
            }
          }
        }

        if (combined.length > 0) {
          setBookings(combined)
        }
      } catch (err) {
        console.warn('Could not load customer requests and bookings:', err)
      }
    } else if (targetRole === 'provider') {
      try {
        const res = await bookingApi.listMine()
        if (res?.success && Array.isArray(res.data)) {
          const incoming: Booking[] = []
          const activeOrPast: Booking[] = []

          res.data.forEach((b: any) => {
            const rawDesc = (b as any).request?.description || b.notes || ''
            const serviceName = b.service?.name || 'Đơn dịch vụ'
            const parsed = parseRequestTitleAndDesc(rawDesc, serviceName)
            const bStatusUpper = String(b.status || '').toUpperCase()
            const mappedUiStatus =
              bStatusUpper === 'COMPLETED'
                ? 'completed'
                : bStatusUpper === 'CANCELLED'
                ? 'cancelled'
                : bStatusUpper === 'PENDING_CONFIRMATION' || bStatusUpper === 'PENDING'
                ? 'pending'
                : 'in_progress'

            const mappedItem: Booking = {
              id: b.id || b._id,
              category: b.service?.category?.name || 'Chưa phân loại',
              categorySlug: b.service?.category?.slug,
              categoryIcon: b.service?.category?.icon,
              title: parsed.title,
              description: parsed.description || b.completionNote || b.notes || (typeof b.address === 'object' ? b.address?.addressLine : '') || '',
              status: mappedUiStatus as BookingStatus,
              rawStatus: bStatusUpper || b.status,
              allowedTransitions: b.allowedTransitions || [],
              proofPhotos: b.proofPhotos || b.progressPhotos || [],
              progressPhotos: b.progressPhotos || [],
              completionNote: b.completionNote || '',
              date: b.scheduledStartAt ? formatVietnamDate(b.scheduledStartAt) : '',
              time: b.scheduledStartAt ? formatVietnamTime(b.scheduledStartAt) : '',
              address: typeof b.address === 'string' ? b.address : (b.address?.addressLine || 'TP.HCM'),
              budget: b.totalAmount || b.price || 0,
              ...(b.finalPrice != null ? { finalPrice: b.finalPrice } : {}),
              photos: b.proofPhotos?.length || 0,
              createdAt: b.createdAt ? formatVietnamDate(b.createdAt) : 'Vừa xong',
              customerName: b.customer?.fullName || 'Khách hàng',
              customerPhone: b.customer?.phone || '',
              distanceKm: typeof b.distanceKm === 'number' ? b.distanceKm : undefined,
            }

            if (bStatusUpper === 'PENDING_CONFIRMATION' || bStatusUpper === 'PENDING') {
              incoming.push(mappedItem)
            } else {
              activeOrPast.push(mappedItem)
            }
          })

          setJobRequests(incoming)
          setProviderJobs(activeOrPast)
        }
      } catch (err) {
        console.warn('Could not load provider bookings:', err)
      }
    } else if (targetRole === 'staff' || targetRole === 'admin') {
      try {
        const [bookingsRes, requestsRes, complaintsRes, verificationsRes] = await Promise.allSettled([
          bookingApi.listAll({ limit: 50 }),
          getDispatchRequests({ limit: 50 }),
          complaintApi.list({ limit: 50 }),
          providerVerificationApi.list({ limit: 50 }),
        ])

        const bookingList: Booking[] = []

        if (bookingsRes.status === 'fulfilled' && bookingsRes.value?.success && Array.isArray(bookingsRes.value.data)) {
          bookingsRes.value.data.forEach((b: any) => {
            const rawDesc = (b as any).request?.description || b.notes || ''
            const serviceName = b.service?.name || 'Đơn dịch vụ'
            const parsed = parseRequestTitleAndDesc(rawDesc, serviceName)

            bookingList.push({
              id: b.id || b._id,
              category: b.service?.category?.name || 'Chưa phân loại',
              categorySlug: b.service?.category?.slug,
              categoryIcon: b.service?.category?.icon,
              title: parsed.title,
              description: parsed.description || b.completionNote || b.notes || '',
              status: (b.status === 'COMPLETED' ? 'completed' : b.status === 'CANCELLED' ? 'cancelled' : b.status === 'IN_PROGRESS' ? 'in_progress' : 'pending') as BookingStatus,
              date: b.scheduledStartAt ? formatVietnamDate(b.scheduledStartAt) : '',
              time: b.scheduledStartAt ? formatVietnamTime(b.scheduledStartAt) : '',
              address: typeof b.address === 'string' ? b.address : (b.address?.addressLine || 'TP.HCM'),
              budget: b.totalAmount || b.price || 0,
              photos: b.progressPhotos?.length || 0,
              createdAt: b.createdAt ? formatVietnamDate(b.createdAt) : 'Vừa xong',
              customerName: b.customer?.fullName || 'Khách hàng',
              distanceKm: typeof b.distanceKm === 'number' ? b.distanceKm : undefined,
            })
          })
        }

        if (requestsRes.status === 'fulfilled' && requestsRes.value?.requests && Array.isArray(requestsRes.value.requests)) {
          requestsRes.value.requests.forEach((r: any) => {
            if (!bookingList.some((b) => b.id === r.id || b.id === r._id)) {
              const serviceName = typeof r.service === 'object' && r.service?.name ? r.service.name : undefined
              const parsed = parseRequestTitleAndDesc(r.description, serviceName)

              bookingList.push({
                id: r.id || r._id,
                category: (typeof r.service === 'object' && r.service?.category?.name ? r.service.category.name : 'Chưa phân loại') as any,
                categorySlug: typeof r.service === 'object' ? r.service?.category?.slug : undefined,
                title: parsed.title,
                description: parsed.description || r.description || '',
                status: (r.status === 'BOOKED' ? 'pending' : r.status === 'CANCELLED' ? 'cancelled' : 'pending') as BookingStatus,
                date: r.preferredStartAt ? formatVietnamDate(r.preferredStartAt) : '',
                time: r.preferredStartAt ? formatVietnamTime(r.preferredStartAt) : '',
                address: r.address?.addressLine || 'TP.HCM',
                budget: r.budgetMax || r.budgetMin || 0,
                photos: r.attachments?.length || 0,
                createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
                customerName: r.customer?.fullName || 'Khách hàng',
                distanceKm: typeof r.distanceKm === 'number' ? r.distanceKm : undefined,
              })
            }
          })
        }

        if (bookingList.length > 0) {
          setBookings(bookingList)
        }

        if (complaintsRes.status === 'fulfilled' && complaintsRes.value?.data && Array.isArray(complaintsRes.value.data)) {
          const mappedComplaints: Complain[] = complaintsRes.value.data.map((c: any) => ({
            id: c.id || c._id,
            bookingId: c.booking?._id || c.booking?.id || c.booking || '',
            customerName: c.reporter?.fullName || 'Khách hàng',
            providerName: c.against?.fullName || c.booking?.provider?.fullName || 'Thợ dịch vụ',
            category: (c.category || 'Cleaning') as any,
            title: c.category || 'Khiếu nại dịch vụ',
            content: c.description || '',
            status: c.status === 'RESOLVED' ? 'resolved' : c.status === 'UNDER_REVIEW' ? 'investigating' : 'open',
            createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
            resolution: c.resolutionNote,
          }))
          setComplaints(mappedComplaints)
        }

        if (verificationsRes.status === 'fulfilled' && verificationsRes.value?.data && Array.isArray(verificationsRes.value.data)) {
          const mappedVerifications: ProviderVerification[] = verificationsRes.value.data.map((v: any) => ({
            id: v.id || v._id,
            providerName: v.user?.fullName || v.businessName || 'Thợ dịch vụ',
            email: v.user?.email || '',
            phone: v.user?.phone || '',
            category: (v.serviceCategories?.[0]?.name || 'Cleaning') as any,
            experienceYears: v.yearsOfExperience || 1,
            identityCard: v.documents?.find((d: any) => d.docType === 'ID_CARD')?.fileUrl || 'Đã tải lên',
            documentsCount: v.documents?.length || 0,
            status: v.verificationStatus === 'VERIFIED' ? 'approved' : v.verificationStatus === 'REJECTED' ? 'rejected' : 'pending',
            submittedAt: v.createdAt ? new Date(v.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
          }))
          setVerifications(mappedVerifications)
        }
      } catch (err) {
        console.warn('Could not load staff operational data:', err)
      }
    }
  }

  const updateUserProfile = async (data: { name?: string; phone?: string; address?: string; currentPassword?: string }) => {
    if (!currentUser) return
    let updatedUser: UserAccount = {
      ...currentUser,
      ...(data.name !== undefined ? { name: data.name, avatar: data.name.slice(0, 2).toUpperCase() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
    }

    if (accessToken) {
      try {
        const res = await updateCurrentUser(accessToken, {
          fullName: data.name,
          phone: data.phone,
          address: data.address,
          currentPassword: data.currentPassword,
        })
        updatedUser = toUserAccount(res)
      } catch (err) {
        console.warn('Backend profile update failed, using local update:', err)
      }
    }

    setCurrentUser(updatedUser)
    try {
      authStorage.setSession(accessToken || '', {
        id: updatedUser.id,
        fullName: updatedUser.name,
        email: updatedUser.email,
        role: ({
          customer: 'CUSTOMER',
          provider: 'PROVIDER',
          staff: 'STAFF',
          admin: 'ADMIN',
        } as const)[updatedUser.role],
      })
    } catch {
      // Ignore
    }
  }

  const login = (user: UserAccount, token: string) => {
    setCurrentUser(user)
    setRole(user.role)
    setAccessToken(token)
    setIsLoggedIn(true)
    setStoredToken(token)
    try {
      window.localStorage.setItem('hsb_access_token', token)
      authStorage.setSession(token, {
        id: user.id,
        fullName: user.name,
        email: user.email,
        role: ({
          customer: 'CUSTOMER',
          provider: 'PROVIDER',
          staff: 'STAFF',
          admin: 'ADMIN',
        } as const)[user.role],
      })
    } catch {
      // Session remains available in memory when browser storage is unavailable.
    }
    void loadUserBookings(user.role)

    if (user.role === 'customer') setCustomerTab('home')
    else if (user.role === 'provider') setProviderTab('dashboard')
    else if (user.role === 'staff') setStaffTab('complaints')
    else if (user.role === 'admin') {
      const requestedTab = new URLSearchParams(window.location.search).get('adminTab') as AdminTab | null
      const validTabs: AdminTab[] = ['dashboard', 'reports', 'users', 'providers', 'categories', 'services', 'reviews', 'policies']
      switchAdminTab(requestedTab && validTabs.includes(requestedTab) ? requestedTab : 'dashboard')
    }

    setAuthModalOpen(false)
  }

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch (err) {
      console.warn('Backend logout failed:', err)
    } finally {
      removeStoredToken()
      setIsLoggedIn(false)
      setCurrentUser(null)
      setAccessToken(null)
      setRole('customer')
      setCustomerTab('home')
      try {
        window.localStorage.removeItem('hsb_access_token')
        authStorage.clear()
      } catch {
        // Ignore unavailable browser storage.
      }
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
        if (active) { login(user, token); void loadUserBookings(user.role); }
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

  const resolveComplain = async (id: string, resolution: string) => {
    await complaintApi.resolve(id, resolution, 'RESOLVED')
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'resolved',
              resolution,
              resolvedAt: new Date().toISOString(),
            }
          : c,
      ),
    )
  }

  const approveVerification = async (id: string) => {
    await providerVerificationApi.approve(id, 'Đã thẩm định và duyệt hồ sơ thợ')
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'approved' } : v)),
    )
  }

  const rejectVerification = async (id: string, reason?: string) => {
    await providerVerificationApi.reject(id, reason || 'Hồ sơ chưa đạt tiêu chuẩn yêu cầu')
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'rejected' } : v)),
    )
  }

  const cancelOrRescheduleBooking = async (
    bookingId: string,
    action: 'cancel' | 'reschedule',
    newDate?: string,
  ) => {
    if (action === 'cancel') {
      await bookingApi.cancel(bookingId, 'Nhân viên hỗ trợ hủy đơn theo yêu cầu của khách')
    } else if (action === 'reschedule' && newDate) {
      const scheduledStartAt = newDate.includes('T')
        ? dateTimeLocalToIso(newDate)
        : vietnamWallClockToIso(newDate, '09:00')
      await bookingApi.reschedule(bookingId, scheduledStartAt, 'Nhân viên hỗ trợ dời lịch hẹn')
    }

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

      profileModalOpen,
      openProfileModal,
      closeProfileModal,
      updateUserProfile,

      login,
      logout,

      customerTab,
      setCustomerTab,
      serviceSearchKeyword,
      serviceSearchCategoryId,
      openServiceSearch: (keyword = '', categoryId = '') => {
        setServiceSearchKeyword(keyword)
        setServiceSearchCategoryId(categoryId)
        setCustomerTab('search')
      },
      selectedServiceId,
      selectedProviderId,
      openProviderProfile: (providerId: string) => {
        if (customerTab !== 'provider-profile') {
          setProviderProfileReturnTab(customerTab)
        }
        setSelectedProviderId(providerId)
        setCustomerTab('provider-profile')
      },
      closeProviderProfile: () => setCustomerTab(providerProfileReturnTab),
      focusedBookingId,
      focusBooking: (bookingId: string) => {
        setFocusedBookingId(bookingId)
        setCustomerTab('bookings')
      },
      clearFocusedBooking: () => setFocusedBookingId(null),
      focusedRequestId,
      focusRequest: (requestId: string) => {
        setFocusedRequestId(requestId)
        setCustomerTab('bookings')
      },
      clearFocusedRequest: () => setFocusedRequestId(null),
      focusedVerificationId,
      focusVerification: (verificationId: string) => {
        setFocusedVerificationId(verificationId)
        setStaffTab('verifications')
      },
      clearFocusedVerification: () => setFocusedVerificationId(null),
      openServiceDetail: (serviceId) => {
        setSelectedServiceId(serviceId)
        setCustomerTab('service-detail')
      },
      providerTab,
      setProviderTab,
      staffTab,
      setStaffTab,
      adminTab,
      setAdminTab: switchAdminTab,

      bookings,
      jobRequests,
      providerJobs,
      chat,

      bookingFlowOpen,
      openBookingFlow: (category, service, provider) => {
        if (!isLoggedIn) {
          setPresetCategory(category ?? null)
          setPresetService(service ?? null)
          setPresetProvider(provider ?? null)
          setAuthMode('login')
          setAuthModalOpen(true)
          return
        }
        setPresetCategory(category ?? null)
        setPresetService(service ?? null)
        setPresetProvider(provider ?? null)
        setBookingFlowOpen(true)
      },
      closeBookingFlow: () => {
        setBookingFlowOpen(false)
        setPresetCategory(null)
        setPresetService(null)
        setPresetProvider(null)
      },
      presetCategory,
      presetService,
      presetProvider,

      providerReviewId,
      openProviderReview: (id) => setProviderReviewId(id),
      closeProviderReview: () => setProviderReviewId(null),

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
      serviceCategories,
      serviceCategoriesLoading,
      serviceCategoriesError,
      backendServices,
      cancelOrRescheduleBooking,

      loadUserBookings,
      submitBooking: async (input) => {
        try {
          const payload = buildServiceRequestPayload(
            input,
            currentUser?.name,
            currentUser?.phone,
            backendServices
          )
          const newReq = await postCreateServiceRequest(payload)
          const reqId = newReq.id || (newReq as any)._id
          const booking: Booking = {
            id: reqId || nextId('b'),
            ...input,
            date: new Date(`${input.date}T12:00:00`).toLocaleDateString('vi-VN'),
            status: 'pending',
            createdAt: 'Vừa xong',
            customerName: currentUser?.name || 'Bạn',
            distanceKm: undefined,
            requestId: reqId,
            isOpenRequest: true,
          }
          setBookings((prev) => [booking, ...prev])
          return booking
        } catch (err) {
          console.error('Backend API request error:', err)
          throw err
        }
      },

      updateJobStatus: async (jobId, status, note, photos, finalPrice) => {
        const validBackendStatuses = [
          'PENDING_CONFIRMATION',
          'CONFIRMED',
          'PROVIDER_ON_THE_WAY',
          'ARRIVED',
          'IN_PROGRESS',
          'COMPLETED',
          'CANCELLED',
        ]

        let backendStatus = 'IN_PROGRESS' as any
        if (validBackendStatuses.includes(status as any)) {
          backendStatus = status as any
        } else if (status === 'completed') {
          backendStatus = 'COMPLETED'
        } else if (status === 'cancelled') {
          backendStatus = 'CANCELLED'
        } else if (status === 'pending') {
          backendStatus = 'PENDING_CONFIRMATION'
        }

        const mappedUiStatus =
          backendStatus === 'COMPLETED'
            ? 'completed'
            : backendStatus === 'CANCELLED'
            ? 'cancelled'
            : backendStatus === 'PENDING_CONFIRMATION'
            ? 'pending'
            : 'in_progress'

        // If this job is in jobRequests (pending confirmation):
        const pendingJob = jobRequests.find((r) => r.id === jobId)
        if (pendingJob) {
          try {
            if (backendStatus === 'CONFIRMED' || status === 'in_progress' || status === 'confirmed') {
              await bookingApi.confirm(jobId)
              setJobRequests((prev) => prev.filter((r) => r.id !== jobId))
              setProviderJobs((prev) => [
                {
                  ...pendingJob,
                  status: 'in_progress',
                  rawStatus: 'CONFIRMED',
                },
                ...prev,
              ])
            } else if (backendStatus === 'CANCELLED' || status === 'cancelled') {
              await bookingApi.decline(jobId, 'BUSY', note || 'Bận lịch')
              setJobRequests((prev) => prev.filter((r) => r.id !== jobId))
            }
          } catch (err) {
            console.error('Failed to confirm/decline incoming job:', err)
          }
          return
        }

        try {
          await bookingApi.updateStatus(jobId, {
            status: backendStatus,
            note,
            confirmCompletion: backendStatus === 'COMPLETED',
            photos,
            finalPrice,
          })
        } catch (err) {
          console.warn('Could not update job status on backend:', err)
        }

        setProviderJobs((prev) =>
          prev.map((j) => {
            if (j.id !== jobId) return j
            const currentPhotos = j.proofPhotos || []
            const newPhotos =
              photos && photos.length > 0
                ? Array.from(new Set([...currentPhotos, ...photos]))
                : currentPhotos
            return {
              ...j,
              status: mappedUiStatus as any,
              rawStatus: backendStatus,
              ...(note ? { completionNote: note } : {}),
              proofPhotos: newPhotos,
              progressPhotos: newPhotos,
              photos: newPhotos.length || j.photos,
              ...(finalPrice != null ? { finalPrice } : {}),
            }
          }),
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
    profileModalOpen,
    customerTab,
    serviceSearchKeyword,
    serviceSearchCategoryId,
    selectedServiceId,
    selectedProviderId,
    providerProfileReturnTab,
    focusedBookingId,
    focusedRequestId,
    focusedVerificationId,
    providerTab,
    staffTab,
    adminTab,
    bookings,
    jobRequests,
    providerJobs,
    chat,
    bookingFlowOpen,
    presetCategory,
    presetService,
    presetProvider,
    providerReviewId,
    jobDetailId,
    chatBubbleOpen,
    activePartnerId,
    chatBubbleExpanded,
    usersList,
    complaints,
    verifications,
    serviceCategories,
    serviceCategoriesLoading,
    serviceCategoriesError,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
