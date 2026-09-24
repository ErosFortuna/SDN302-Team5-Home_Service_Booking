export type Role = 'customer' | 'provider'

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

export interface Provider {
  id: string
  name: string
  avatar: string
  rating: number
  reviews: number
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
