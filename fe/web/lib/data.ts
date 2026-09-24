import type {
  Booking,
  ChatMessage,
  Provider,
  ServiceCategory,
} from './types'

export const CATEGORIES: {
  name: ServiceCategory
  icon: string
  tint: string
}[] = [
  { name: 'Cleaning', icon: 'Sparkles', tint: 'bg-teal-500' },
  { name: 'Electrical', icon: 'Zap', tint: 'bg-amber-500' },
  { name: 'Plumbing', icon: 'Droplets', tint: 'bg-sky-500' },
  { name: 'Appliance', icon: 'WashingMachine', tint: 'bg-violet-500' },
  { name: 'Painting', icon: 'PaintRoller', tint: 'bg-rose-500' },
]

export const PROVIDERS: Provider[] = [
  {
    id: 'p1',
    name: 'Minh Ngoc Cleaning Co.',
    avatar: 'MN',
    rating: 4.9,
    reviews: 328,
    category: 'Cleaning',
    distanceKm: 1.2,
    completedJobs: 540,
    tagline: 'Deep home & office cleaning specialists',
    verified: true,
  },
  {
    id: 'p2',
    name: 'Bright Spark Electric',
    avatar: 'BS',
    rating: 4.8,
    reviews: 214,
    category: 'Electrical',
    distanceKm: 2.5,
    completedJobs: 410,
    tagline: 'Licensed electricians, same-day service',
    verified: true,
  },
  {
    id: 'p3',
    name: 'AquaFix Plumbing',
    avatar: 'AF',
    rating: 4.7,
    reviews: 189,
    category: 'Plumbing',
    distanceKm: 3.1,
    completedJobs: 302,
    tagline: 'Leaks, pipes & bathroom fittings',
    verified: true,
  },
  {
    id: 'p4',
    name: 'CoolBreeze AC Care',
    avatar: 'CB',
    rating: 4.9,
    reviews: 271,
    category: 'Appliance',
    distanceKm: 1.8,
    completedJobs: 389,
    tagline: 'AC servicing, repair & installation',
    verified: true,
  },
  {
    id: 'p5',
    name: 'ColorHouse Painters',
    avatar: 'CH',
    rating: 4.6,
    reviews: 96,
    category: 'Painting',
    distanceKm: 4.4,
    completedJobs: 158,
    tagline: 'Interior & exterior wall painting',
    verified: false,
  },
]

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'b1',
    category: 'Plumbing',
    title: 'Kitchen sink leaking',
    description:
      'Water pooling under the kitchen sink cabinet. Seems to be from the pipe joint.',
    status: 'quoted',
    date: 'Sep 25, 2026',
    time: '9:00 AM',
    address: '12 Nguyen Hue, District 1, HCMC',
    budget: 500000,
    photos: 2,
    createdAt: '2 hours ago',
    customerName: 'You',
    distanceKm: 3.1,
    quotes: [
      {
        id: 'q1',
        providerId: 'p3',
        laborFee: 300000,
        materialFee: 150000,
        arrival: 'Today, 4:00 PM',
        note: 'Includes replacing the worn pipe joint and sealant.',
        createdAt: '1 hour ago',
      },
      {
        id: 'q2',
        providerId: 'p2',
        laborFee: 250000,
        materialFee: 120000,
        arrival: 'Tomorrow, 9:00 AM',
        note: 'Quick fix, parts included. Warranty 30 days.',
        createdAt: '45 min ago',
      },
    ],
  },
  {
    id: 'b2',
    category: 'Cleaning',
    title: 'Deep clean 2-bedroom apartment',
    description: 'Move-out deep cleaning including kitchen and 2 bathrooms.',
    status: 'in_progress',
    date: 'Sep 23, 2026',
    time: '2:00 PM',
    address: '45 Le Loi, District 3, HCMC',
    budget: 800000,
    photos: 3,
    createdAt: 'Yesterday',
    customerName: 'You',
    distanceKm: 1.2,
    acceptedQuoteId: 'q3',
    quotes: [
      {
        id: 'q3',
        providerId: 'p1',
        laborFee: 700000,
        materialFee: 100000,
        arrival: 'Today, 2:00 PM',
        note: 'Team of 2, eco-friendly supplies included.',
        createdAt: 'Yesterday',
      },
    ],
  },
  {
    id: 'b3',
    category: 'Appliance',
    title: 'AC not cooling',
    description: 'Living room AC blowing warm air, needs gas refill & check.',
    status: 'completed',
    date: 'Sep 18, 2026',
    time: '10:00 AM',
    address: '78 Vo Van Tan, District 3, HCMC',
    budget: 600000,
    photos: 1,
    createdAt: '5 days ago',
    customerName: 'You',
    distanceKm: 1.8,
    acceptedQuoteId: 'q4',
    quotes: [
      {
        id: 'q4',
        providerId: 'p4',
        laborFee: 400000,
        materialFee: 180000,
        arrival: 'Sep 18, 10:00 AM',
        note: 'Gas refill + full system diagnostic.',
        createdAt: '6 days ago',
      },
    ],
  },
  {
    id: 'b4',
    category: 'Painting',
    title: 'Repaint living room walls',
    description: 'Two accent walls, neutral color. Paint provided by customer.',
    status: 'cancelled',
    date: 'Sep 15, 2026',
    time: '8:00 AM',
    address: '5 Pasteur, District 1, HCMC',
    budget: 1200000,
    photos: 0,
    createdAt: '1 week ago',
    customerName: 'You',
    distanceKm: 4.4,
    quotes: [],
  },
]

/** Incoming requests shown on the provider job board. */
export const JOB_REQUESTS: Booking[] = [
  {
    id: 'jr1',
    category: 'Plumbing',
    title: 'Bathroom faucet replacement',
    description: 'Need to replace an old leaking faucet with a new one.',
    status: 'pending',
    date: 'Sep 24, 2026',
    time: '11:00 AM',
    address: 'District 2, HCMC',
    budget: 450000,
    photos: 2,
    createdAt: '15 min ago',
    customerName: 'Tuan Anh',
    distanceKm: 2.5,
    quotes: [],
  },
  {
    id: 'jr2',
    category: 'Plumbing',
    title: 'Clogged shower drain',
    description: 'Shower water draining very slowly, likely a blockage.',
    status: 'pending',
    date: 'Sep 24, 2026',
    time: '3:00 PM',
    address: 'District 1, HCMC',
    budget: 350000,
    photos: 1,
    createdAt: '40 min ago',
    customerName: 'Linh Pham',
    distanceKm: 1.1,
    quotes: [],
  },
  {
    id: 'jr3',
    category: 'Plumbing',
    title: 'Install water heater',
    description: 'New electric water heater to be installed in main bathroom.',
    status: 'pending',
    date: 'Sep 26, 2026',
    time: '9:00 AM',
    address: 'District 7, HCMC',
    budget: 900000,
    photos: 3,
    createdAt: '1 hour ago',
    customerName: 'Hoang Long',
    distanceKm: 5.8,
    quotes: [],
  },
]

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'm1',
    from: 'them',
    text: 'Hi! I saw your request for the kitchen sink leak. Can you tell me how long it has been leaking?',
    time: '10:02 AM',
  },
  {
    id: 'm2',
    from: 'me',
    text: 'Hey! It started this morning. Water is pooling under the cabinet.',
    time: '10:04 AM',
  },
  {
    id: 'm3',
    from: 'them',
    text: "Got it. Likely a worn pipe joint. I can come by this afternoon and fix it. Here's my quote:",
    time: '10:05 AM',
  },
  {
    id: 'm4',
    from: 'them',
    time: '10:05 AM',
    quote: {
      laborFee: 300000,
      materialFee: 150000,
      arrival: 'Today, 4:00 PM',
    },
  },
]

export const QUICK_REPLIES = [
  'Sounds good!',
  'What time can you arrive?',
  'Is the price negotiable?',
  'Please share photos',
]

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫'
}

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}
