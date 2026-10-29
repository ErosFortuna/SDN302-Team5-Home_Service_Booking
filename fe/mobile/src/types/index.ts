export type Role = 'customer' | 'provider';

export type ServiceCategory =
  | 'Cleaning'
  | 'Electrical'
  | 'Plumbing'
  | 'Appliance'
  | 'Painting';

export type BookingStatus =
  | 'pending'
  | 'quoted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Provider {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviews: number;
  category: ServiceCategory;
  distanceKm: number;
  completedJobs: number;
  tagline: string;
  verified: boolean;
}

export interface Quote {
  id: string;
  providerId: string;
  laborFee: number;
  materialFee: number;
  arrival: string;
  note: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  category: ServiceCategory;
  title: string;
  description: string;
  status: BookingStatus;
  date: string;
  time: string;
  address: string;
  budget: number;
  photos: number;
  createdAt: string;
  quotes: Quote[];
  acceptedQuoteId?: string;
  customerName: string;
  distanceKm: number;
}

export interface ChatMessage {
  id: string;
  from: 'me' | 'them';
  text?: string;
  time: string;
  quote?: {
    laborFee: number;
    materialFee: number;
    arrival: string;
  };
}

export interface NewBookingInput {
  category: ServiceCategory;
  title: string;
  description: string;
  date: string;
  time: string;
  address: string;
  budget: number;
  photos: number;
  attachments?: string[];
}

export interface ProviderQuoteInput {
  laborFee: number;
  materialFee: number;
  arrival: string;
  note?: string;
}

// ─── COMPLAINT TYPES (KAN-13, KAN-19, KAN-26) ──────────────────────────────────
export type ComplaintCategory =
  | 'QUALITY'
  | 'LATE_ARRIVAL'
  | 'NO_SHOW'
  | 'PRICE'
  | 'BEHAVIOR'
  | 'DAMAGE'
  | 'OTHER';

export type ComplaintStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CLOSED';

export interface ComplaintReply {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'provider' | 'staff' | 'admin';
  message: string;
  evidenceUrls?: string[];
  createdAt: string;
}

export interface Complaint {
  id: string;
  bookingId: string;
  bookingTitle?: string;
  reporterId: string;
  reporterName: string;
  againstId: string;
  againstName: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  evidenceUrls?: string[];
  status: ComplaintStatus;
  resolutionNote?: string;
  refundAmount?: number;
  resolvedBy?: string;
  resolvedAt?: string;
  providerResponse?: {
    note: string;
    respondedAt?: string;
  };
  replies?: ComplaintReply[];
  createdAt: string;
}

export interface CreateComplaintInput {
  bookingId: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  evidenceUrls?: string[];
}


// ─── PROVIDER RECOMMENDATION & SEARCH TYPES ────────────────────────────────────
export interface ScoreBreakdown {
  ratingScore: number;
  distanceScore: number;
  experienceScore: number;
  scheduleScore: number;
  budgetScore: number;
}

export interface RecommendedProvider {
  providerId: string;
  fullName: string;
  businessName: string;
  avatarUrl?: string | null;
  averageRating: number;
  reviewCount: number;
  completedJobCount: number;
  yearsOfExperience: number;
  distanceKm: number | null;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: string[];
}

export interface RecommendedProvidersParams {
  limit?: number;
  radiusKm?: number;
  sortBy?: 'score' | 'rating' | 'distance';
}

export interface ProviderSearchResult {
  providerId: string;
  fullName: string;
  businessName: string;
  avatarUrl?: string | null;
  averageRating: number;
  reviewCount: number;
  completedJobCount: number;
  yearsOfExperience: number;
  city?: string | null;
  serviceAreas: string[];
  distanceKm: number | null;
}

export interface ProviderSearchParams {
  serviceId?: string;
  categoryId?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minRating?: number;
  page?: number;
  limit?: number;
}
