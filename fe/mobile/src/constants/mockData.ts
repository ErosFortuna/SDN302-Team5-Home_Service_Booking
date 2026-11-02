import { Booking, ChatMessage, Provider, ServiceCategory } from '../types';

export const CATEGORIES: {
  name: ServiceCategory;
  vietnameseTitle: string;
  iconName: 'cleaning' | 'electrical' | 'plumbing' | 'appliance' | 'wrench';
  color: string;
  bgColor: string;
}[] = [
  {
    name: 'Cleaning',
    vietnameseTitle: 'Vệ sinh nhà',
    iconName: 'cleaning',
    color: '#00B4A6',
    bgColor: '#E6F7F5',
  },
  {
    name: 'Electrical',
    vietnameseTitle: 'Điện dân dụng',
    iconName: 'electrical',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  {
    name: 'Plumbing',
    vietnameseTitle: 'Sửa ống nước',
    iconName: 'plumbing',
    color: '#0284C7',
    bgColor: '#E0F2FE',
  },
  {
    name: 'Appliance',
    vietnameseTitle: 'Điều hoà & Điện lạnh',
    iconName: 'appliance',
    color: '#8B5CF6',
    bgColor: '#F3EEFF',
  },
  {
    name: 'Painting',
    vietnameseTitle: 'Sơn & Trang trí',
    iconName: 'wrench',
    color: '#F43F5E',
    bgColor: '#FFE4E6',
  },
];

export const PROVIDERS: Provider[] = [
  {
    id: 'p1',
    name: 'Công ty Vệ sinh Minh Ngọc',
    avatar: 'MN',
    rating: 4.9,
    reviews: 328,
    category: 'Cleaning',
    distanceKm: 1.2,
    completedJobs: 540,
    tagline: 'Chuyên gia vệ sinh căn hộ & văn phòng',
    verified: true,
  },
  {
    id: 'p2',
    name: 'Cơ điện Sáng Tạo (Bright Spark)',
    avatar: 'BS',
    rating: 4.8,
    reviews: 214,
    category: 'Electrical',
    distanceKm: 2.5,
    completedJobs: 410,
    tagline: 'Thợ điện có chứng chỉ, phục vụ trong ngày',
    verified: true,
  },
  {
    id: 'p3',
    name: 'Sửa nước AquaFix',
    avatar: 'AF',
    rating: 4.7,
    reviews: 189,
    category: 'Plumbing',
    distanceKm: 3.1,
    completedJobs: 302,
    tagline: 'Xử lý rò rỉ, đường ống & thiết bị vệ sinh',
    verified: true,
  },
  {
    id: 'p4',
    name: 'Điện lạnh CoolBreeze',
    avatar: 'CB',
    rating: 4.9,
    reviews: 271,
    category: 'Appliance',
    distanceKm: 1.8,
    completedJobs: 389,
    tagline: 'Bảo dưỡng, nạp gas & sửa chữa máy lạnh',
    verified: true,
  },
  {
    id: 'p5',
    name: 'Sơn nhà ColorHouse',
    avatar: 'CH',
    rating: 4.6,
    reviews: 96,
    category: 'Painting',
    distanceKm: 4.4,
    completedJobs: 158,
    tagline: 'Sơn tường nội thất & ngoại thất chuyên nghiệp',
    verified: false,
  },
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'b1',
    category: 'Plumbing',
    title: 'Rò rỉ bồn rửa chén nhà bếp',
    description: 'Nước đọng dưới tủ bếp, có vẻ bị hở mối nối đường ống thoát.',
    status: 'pending',
    date: '25/09/2026',
    time: '09:00',
    address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
    budget: 500000,
    photos: 2,
    createdAt: '2 giờ trước',
    customerName: 'Bạn',
    distanceKm: 3.1,
  },
  {
    id: 'b4',
    category: 'Painting',
    title: 'Sơn lại mảng tường phòng khách',
    description: 'Sơn dặm 2 mảng tường màu be, sơn gia chủ tự chuẩn bị.',
    status: 'cancelled',
    date: '15/09/2026',
    time: '08:00',
    address: '5 Pasteur, Quận 1, TP.HCM',
    budget: 1200000,
    photos: 0,
    createdAt: '1 tuần trước',
    customerName: 'Bạn',
    distanceKm: 4.4,
  },
];

export const JOB_REQUESTS: Booking[] = [
  {
    id: 'jr1',
    category: 'Plumbing',
    title: 'Thay vòi nước bồn rửa mặt lavabo',
    description: 'Vòi nước cũ bị gãy cần thay vòi inox mới, đã mua sẵn vòi.',
    status: 'pending',
    date: '24/09/2026',
    time: '11:00',
    address: 'Thảo Điền, TP. Thủ Đức, TP.HCM',
    budget: 450000,
    photos: 2,
    createdAt: '15 phút trước',
    customerName: 'Tuấn Anh',
    distanceKm: 2.5,
  },
  {
    id: 'jr2',
    category: 'Plumbing',
    title: 'Thông nghẹt cống thoát sàn nhà tắm',
    description: 'Nước thoát rất chậm khi tắm, nghi bị vướng tóc và cặn xà phòng.',
    status: 'pending',
    date: '24/09/2026',
    time: '15:00',
    address: 'Bến Nghé, Quận 1, TP.HCM',
    budget: 350000,
    photos: 1,
    createdAt: '40 phút trước',
    customerName: 'Linh Phạm',
    distanceKm: 1.1,
  },
  {
    id: 'jr3',
    category: 'Plumbing',
    title: 'Lắp đặt máy nước nóng trực tiếp',
    description: 'Cần thợ lắp máy nước nóng Ariston mới mua vào phòng tắm chính.',
    status: 'pending',
    date: '26/09/2026',
    time: '09:00',
    address: 'Khu dân cư Him Lam, Quận 7, TP.HCM',
    budget: 900000,
    photos: 3,
    createdAt: '1 giờ trước',
    customerName: 'Hoàng Long',
    distanceKm: 5.8,
  },
];

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'm1',
    from: 'them',
    text: 'Chào bạn! Mình thấy yêu cầu xử lý rò rỉ bồn rửa chén của bạn. Hiện tượng rò rỉ diễn ra bao lâu rồi ạ?',
    time: '10:02',
  },
  {
    id: 'm2',
    from: 'me',
    text: 'Chào bạn! Bắt đầu từ sáng nay, nước chảy nhỏ giọt và đọng dưới hộc tủ bếp.',
    time: '10:04',
  },
  {
    id: 'm3',
    from: 'them',
    text: 'Dạ, khả năng cao là gioăng cao su mối nối bị mòn. Chiều nay tầm 16h mình ghé qua xử lý dứt điểm cho bạn nhé. Mình đã nhận lịch đặt của bạn.',
    time: '10:05',
  },
  {
    id: 'm4',
    from: 'them',
    text: 'Hẹn gặp bạn vào lúc 16:00 chiều nay nhé!',
    time: '10:05',
  },
];

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
