export type Role = 'customer' | 'provider' | 'staff' | 'admin'

export type ServiceCategory = string

export interface ServiceCategoryItem {
  id: string
  name: ServiceCategory
  slug: string
  description?: string
  isActive: boolean
  sortOrder: number
}

export interface ServiceItem {
  id: string
  category: { id: string; name: string; slug: string } | null
  name: string
  slug: string
  description?: string
  basePrice: number
  estimatedDurationMinutes: number
  pricingType: 'FIXED' | 'FROM' | 'QUOTE_REQUIRED'
  isActive: boolean
  requirements?: string[]
}

export interface ServiceRequestItem {
  id: string
  customer: string
  service: ServiceItem | null
  description: string
  address: {
    label?: string
    recipientName: string
    phone: string
    addressLine: string
    ward?: string
    district?: string
    city: string
  }
  preferredStartAt: string
  preferredEndAt: string
  budgetMin?: number
  budgetMax?: number
  status: 'OPEN' | 'QUOTED' | 'BOOKED' | 'CANCELLED' | 'EXPIRED'
  attachments: string[]
  createdAt: string
}

export type BookingStatus =
  | 'pending'
  | 'quoted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface UserAccount {
  id: string
  name: string
  email: string
  role: Role
  phone: string
  avatar?: string
  address?: string
  // For provider registration
  skills?: string[]
  experienceYears?: number
  identityCard?: string
  verifiedStatus?: 'verified' | 'pending' | 'rejected'
}

export interface Review {
  id: string
  providerId?: string
  customerName: string
  rating: number
  comment: string
  createdAt: string
}

export interface Provider {
  id: string
  name: string
  avatar: string
  rating: number
  reviews: number
  averageRating?: number
  reviewCount?: number
  category: ServiceCategory
  distanceKm: number
  completedJobs: number
  tagline: string
  verified: boolean
}

export interface Quote {
  id: string
  providerId: string
  laborFee: number
  materialFee: number
  arrival: string
  note: string
  createdAt: string
}

export interface TimelineStep {
  key: BookingStatus
  label: string
}

export interface Booking {
  id: string
  category: ServiceCategory
  title: string
  description: string
  status: BookingStatus
  date: string
  time: string
  address: string
  budget: number
  photos: number
  createdAt: string
  quotes: Quote[]
  acceptedQuoteId?: string
  customerName: string
  distanceKm: number
}

export interface ChatMessage {
  id: string
  from: 'me' | 'them'
  text?: string
  time: string
  quote?: {
    laborFee: number
    materialFee: number
    arrival: string
  }
}

// Data models according to Use Case Diagram (Staff & Admin)
export interface Complain {
  id: string
  bookingId: string
  customerName: string
  providerName: string
  category: ServiceCategory
  title: string
  content: string
  status: 'open' | 'investigating' | 'resolved'
  createdAt: string
  resolution?: string
  refundAmount?: number
}

export interface Policy {
  id: string
  title: string
  category: string
  content: string
  effectiveDate: string
  status: 'active' | 'draft'
}

export interface ProviderVerification {
  id: string
  providerName: string
  email: string
  phone: string
  category: ServiceCategory
  experienceYears: number
  identityCard: string
  documentsCount: number
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
}
