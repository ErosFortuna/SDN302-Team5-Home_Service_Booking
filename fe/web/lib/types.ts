export type Role = 'customer' | 'provider' | 'staff' | 'admin'

export type ServiceCategory =
  | 'Cleaning'
  | 'Electrical'
  | 'Plumbing'
  | 'Appliance'
  | 'Painting'

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
