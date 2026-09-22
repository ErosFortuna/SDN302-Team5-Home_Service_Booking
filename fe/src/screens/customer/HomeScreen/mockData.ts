import { Colors } from '../../../constants/colors';

export const CATEGORIES = [
  { key: "plumbing", title: "Sửa ống nước", subtitle: "4 dịch vụ" },
  { key: "airConditioning", title: "Điều hoà", subtitle: "3 dịch vụ" },
  { key: "electrical", title: "Điện dân dụng", subtitle: "5 dịch vụ" },
  { key: "cleaning", title: "Vệ sinh nhà", subtitle: "6 dịch vụ" },
  { key: "applianceRepair", title: "Thiết bị gia dụng", subtitle: "8 dịch vụ" },
] as const;

export const PROVIDERS = [
  {
    id: "1",
    name: "Nguyễn Văn An",
    rating: 4.9,
    reviewCount: 128,
    distance: "1.8 km",
    verified: true,
  },
  {
    id: "2",
    name: "Trần Minh Tuấn",
    rating: 4.7,
    reviewCount: 84,
    distance: "2.3 km",
    verified: true,
  },
  {
    id: "3",
    name: "Lê Thị Hoa",
    rating: 4.8,
    reviewCount: 210,
    distance: "3.1 km",
    verified: false,
  },
];

export const STATS = [
  { icon: "request", label: "3 yêu cầu", color: Colors.primary[500] },
  { icon: "star", label: "4.8 đánh giá", color: Colors.accent[600] },
  { icon: "check", label: "12 hoàn thành", color: Colors.semantic.success },
] as const;

export const RECENT_BOOKINGS = [
  {
    id: "1",
    serviceName: "Vệ sinh máy lạnh",
    categoryKey: "airConditioning" as const,
    providerName: "Nguyễn Văn An",
    bookingStatus: "inProgress" as const,
    scheduledDate: "21/09 – 14:00",
    amount: 150000,
  },
  {
    id: "2",
    serviceName: "Sửa ổ cắm điện",
    categoryKey: "electrical" as const,
    providerName: "Trần Minh Tuấn",
    bookingStatus: "confirmed" as const,
    scheduledDate: "22/09 – 09:00",
    amount: 200000,
  },
];
