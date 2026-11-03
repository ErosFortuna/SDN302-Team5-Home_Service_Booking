/**
 * Comprehensive Full Project Seed Script for "Home Service Booking System"
 *
 * Seeds all 14 domain models across the entire application lifecycle:
 *  1. Users (Admin, Staff, Providers with various verification states, Customers)
 *  2. Service Categories (7 active with icons + 1 inactive)
 *  3. Services (14 services with FIXED / FROM pricing)
 *  4. Provider Profiles (with GeoJSON, skills, bio, ratings, verification logs)
 *  5. Availability schedules (working hours, lunch breaks, exceptions)
 *  6. Membership Plans (Standard, Pro, Enterprise)
 *  7. Provider Subscriptions & Membership Payments (PayOS integration demo)
 *  8. Service Requests (OPEN, BOOKED, CANCELLED, with optional AI analysis)
 *  9. Bookings (CONFIRMED, IN_PROGRESS with materials, COMPLETED, CANCELLED)
 * 10. Reviews & Ratings (with customer comments & provider responses)
 * 11. Complaints & Dispute Arbitration (with replies from Customer, Provider, Staff)
 * 12. System Notifications (for Customers, Providers, and Staff)
 * 13. Financial Payments (spread across the last 30 days for rich Admin Revenue Reports)
 *
 * Fully idempotent: safe to execute multiple times.
 */

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db.js');

// Domain Models
const User = require('../modules/users/user.model.js');
const ServiceCategory = require('../modules/categories/service-category.model.js');
const Service = require('../modules/services/service.model.js');
const ProviderProfile = require('../modules/providers/provider.model.js');
const Availability = require('../modules/availability/availability.model.js');
const MembershipPlan = require('../modules/payments/membership-plan.model.js');
const ProviderSubscription = require('../modules/payments/provider-subscription.model.js');
const MembershipPayment = require('../modules/payments/membership-payment.model.js');
const ServiceRequest = require('../modules/requests/request.model.js');
const Booking = require('../modules/bookings/booking.model.js');
const Review = require('../modules/reviews/review.model.js');
const Complaint = require('../modules/complaints/complaint.model.js');
const Notification = require('../modules/notifications/notification.model.js');
const Payment = require('../modules/report/payment.model.js');

const PASSWORD = 'Demo123!';
const ADMIN_PASSWORD = 'ChangeMe123!';

// Fixed Deterministic IDs to maintain clean relations & idempotency
const ID = {
  req: (n) => new mongoose.Types.ObjectId(`66f2000000000000000000${String(n).padStart(2, '0')}`),
  booking: (n) => new mongoose.Types.ObjectId(`66f3000000000000000000${String(n).padStart(2, '0')}`),
  complaint: (n) => new mongoose.Types.ObjectId(`66f4000000000000000000${String(n).padStart(2, '0')}`),
  review: (n) => new mongoose.Types.ObjectId(`66f5000000000000000000${String(n).padStart(2, '0')}`),
};

async function upsert(Model, filter, updateData) {
  await Model.updateOne(filter, { $set: updateData }, { upsert: true });
  return Model.findOne(filter);
}

async function seedFullProject() {
  console.log('Connecting to database...');
  await connectDB();
  console.log('Connected! Starting full project seed...\n');

  const demoHash = await bcrypt.hash(PASSWORD, 12);
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // =========================================================================
  // 1. USERS MATRIX
  // =========================================================================
  console.log('1. Seeding Users (Admin, Staff, Providers, Customers)...');
  const usersData = [
    // Admins
    { email: 'admin@homecare.local', fullName: 'System Administrator', phone: '0900000000', passwordHash: adminHash, role: 'ADMIN', status: 'ACTIVE' },
    { email: 'admin.demo@homecare.local', fullName: 'Quản trị viên Demo', phone: '0955555555', passwordHash: demoHash, role: 'ADMIN', status: 'ACTIVE' },

    // Staff
    { email: 'staff.demo@homecare.local', fullName: 'Lê Văn Hiếu (CSKH & Thẩm định)', phone: '0966666666', passwordHash: demoHash, role: 'STAFF', status: 'ACTIVE' },
    { email: 'staff2.demo@homecare.local', fullName: 'Nguyễn Thu Trang (Trọng tài khiếu nại)', phone: '0966666667', passwordHash: demoHash, role: 'STAFF', status: 'ACTIVE' },

    // Providers
    { email: 'provider.demo@homecare.local', fullName: 'Trần Phát Đạt (Điện Nước Phát Đạt)', phone: '0911111111', passwordHash: demoHash, role: 'PROVIDER', status: 'ACTIVE' },
    { email: 'provider2.demo@homecare.local', fullName: 'Phạm Minh Thông (Điện Lạnh Minh Thông)', phone: '0912222222', passwordHash: demoHash, role: 'PROVIDER', status: 'ACTIVE' },
    { email: 'provider3.demo@homecare.local', fullName: 'Võ Ánh Dương (Vệ Sinh Ánh Dương)', phone: '0913333333', passwordHash: demoHash, role: 'PROVIDER', status: 'ACTIVE' },
    { email: 'provider.pending@homecare.local', fullName: 'Lý Kiến Hùng (Chờ duyệt hồ sơ)', phone: '0914444444', passwordHash: demoHash, role: 'PROVIDER', status: 'ACTIVE' },
    { email: 'provider.review@homecare.local', fullName: 'Đặng Tuấn Kiệt (Đang thẩm định)', phone: '0915555555', passwordHash: demoHash, role: 'PROVIDER', status: 'ACTIVE' },
    { email: 'provider.rejected@homecare.local', fullName: 'Hoàng Văn Sơn (Hồ sơ bị từ chối)', phone: '0916666666', passwordHash: demoHash, role: 'PROVIDER', status: 'ACTIVE' },

    // Customers
    { email: 'customer.demo@homecare.local', fullName: 'Nguyễn Thị Thanh', phone: '0922222222', passwordHash: demoHash, role: 'CUSTOMER', status: 'ACTIVE' },
    { email: 'customer2.demo@homecare.local', fullName: 'Trần Minh Khoa', phone: '0944444444', passwordHash: demoHash, role: 'CUSTOMER', status: 'ACTIVE' },
    { email: 'customer3.demo@homecare.local', fullName: 'Lê Hoàng Nam', phone: '0945555555', passwordHash: demoHash, role: 'CUSTOMER', status: 'ACTIVE' },
  ];

  const userMap = {};
  for (const u of usersData) {
    const saved = await upsert(User, { email: u.email }, { ...u, emailVerified: true });
    userMap[u.email] = saved;
  }

  // =========================================================================
  // 2. CATEGORIES
  // =========================================================================
  console.log('2. Seeding Service Categories...');
  const categoriesData = [
    { slug: 'dien-nuoc', name: 'Điện nước', icon: 'droplets', pricingMode: 'FIXED', sortOrder: 1, description: 'Sửa chữa, lắp đặt hệ thống điện và đường ống nước dân dụng.' },
    { slug: 'dien-lanh', name: 'Điện lạnh', icon: 'snowflake', pricingMode: 'FIXED', sortOrder: 2, description: 'Sửa chữa, bảo dưỡng máy lạnh, tủ lạnh, máy nước nóng.' },
    { slug: 'don-dep-nha', name: 'Dọn dẹp nhà', icon: 'sparkles', pricingMode: 'FIXED', sortOrder: 3, description: 'Dọn dẹp theo giờ, tổng vệ sinh định kỳ hoặc sau chuyển nhà.' },
    { slug: 'sua-khoa', name: 'Sửa khóa', icon: 'key', pricingMode: 'FIXED', sortOrder: 4, description: 'Mở khóa, thay ổ khóa, lắp khóa điện tử.' },
    { slug: 'son-sua-nha', name: 'Sơn sửa nhà', icon: 'paintbrush', pricingMode: 'FIXED', sortOrder: 5, description: 'Sơn tường, chống thấm, sửa chữa nhỏ trong nhà.' },
    { slug: 'do-gia-dung', name: 'Sửa đồ gia dụng', icon: 'washing-machine', pricingMode: 'FIXED', sortOrder: 6, description: 'Máy giặt, lò vi sóng, bếp từ và thiết bị gia dụng khác.' },
    { slug: 'diet-con-trung', name: 'Diệt côn trùng', icon: 'bug', pricingMode: 'FIXED', sortOrder: 7, description: 'Phun thuốc diệt muỗi, gián, mối theo gói cố định.' },
    { slug: 'chuyen-nha', name: 'Chuyển nhà trọn gói', icon: 'truck', pricingMode: 'FIXED', sortOrder: 8, isActive: false, description: 'Đóng gói, vận chuyển đồ đạc (tạm ngừng cung cấp).' },
  ];

  const categoryMap = {};
  for (const cat of categoriesData) {
    const saved = await upsert(ServiceCategory, { slug: cat.slug }, { ...cat, isActive: cat.isActive !== false });
    categoryMap[cat.slug] = saved;
  }

  // =========================================================================
  // 3. SERVICES
  // =========================================================================
  console.log('3. Seeding Services...');
  const servicesData = [
    // Điện nước
    { categorySlug: 'dien-nuoc', slug: 'sua-ong-nuoc-ro-ri', name: 'Sửa ống nước rò rỉ', basePrice: 150000, estimatedDurationMinutes: 60, pricingType: 'FIXED', description: 'Khắc phục rò rỉ đường ống nước, van khóa, vòi sen, vòi lavabo.' },
    { categorySlug: 'dien-nuoc', slug: 'sua-dien-dan-dung', name: 'Sửa điện dân dụng', basePrice: 120000, estimatedDurationMinutes: 60, pricingType: 'FROM', description: 'Xử lý sự cố chập điện, nhảy aptomat, thay mới ổ cắm và công tắc.' },
    { categorySlug: 'dien-nuoc', slug: 'lap-dat-bon-cau', name: 'Lắp đặt & thay bồn cầu', basePrice: 350000, estimatedDurationMinutes: 120, pricingType: 'FIXED', description: 'Tháo lắp, căn chỉnh đường ống cấp thoát cho bồn cầu nguyên khối hoặc rời.' },

    // Điện lạnh
    { categorySlug: 'dien-lanh', slug: 've-sinh-may-lanh', name: 'Vệ sinh máy lạnh', basePrice: 150000, estimatedDurationMinutes: 60, pricingType: 'FIXED', description: 'Vệ sinh lưới lọc, xịt rửa dàn nóng, dàn lạnh, đo áp suất gas.' },
    { categorySlug: 'dien-lanh', slug: 'sua-may-lanh', name: 'Sửa máy lạnh', basePrice: 200000, estimatedDurationMinutes: 90, pricingType: 'FROM', description: 'Kiểm tra máy lạnh không lạnh, chảy nước trong phòng, quạt gió kêu to.' },
    { categorySlug: 'dien-lanh', slug: 'nap-gas-may-lanh', name: 'Nạp gas máy lạnh R32 / R410A', basePrice: 250000, estimatedDurationMinutes: 45, pricingType: 'FIXED', description: 'Bơm nạp bổ sung gas lạnh đảm bảo hiệu suất làm mát tối ưu.' },

    // Dọn dẹp nhà
    { categorySlug: 'don-dep-nha', slug: 'don-dep-nha-theo-gio', name: 'Dọn dẹp nhà theo giờ', basePrice: 90000, estimatedDurationMinutes: 120, pricingType: 'FIXED', description: 'Lau dọn nhà cửa, dọn phòng khách, phòng ngủ, nhà vệ sinh theo giờ.' },
    { categorySlug: 'don-dep-nha', slug: 'tong-ve-sinh-can-ho', name: 'Tổng vệ sinh căn hộ', basePrice: 650000, estimatedDurationMinutes: 240, pricingType: 'FROM', description: 'Gói vệ sinh chuyên sâu toàn diện căn hộ chung cư 2-3 phòng ngủ.' },

    // Sửa khóa
    { categorySlug: 'sua-khoa', slug: 'mo-khoa-tai-nha', name: 'Mở khóa tại nhà', basePrice: 150000, estimatedDurationMinutes: 45, pricingType: 'FROM', description: 'Xử lý kẹt khóa, mất chìa khóa cửa phòng, khóa cổng, khóa tay gạt.' },
    { categorySlug: 'sua-khoa', slug: 'lap-khoa-van-tay', name: 'Lắp khóa điện tử vân tay', basePrice: 400000, estimatedDurationMinutes: 120, pricingType: 'FIXED', description: 'Khoan đục cửa gỗ/nhôm và lắp đặt hoàn thiện khóa thông minh.' },

    // Sơn sửa nhà
    { categorySlug: 'son-sua-nha', slug: 'son-tuong-noi-that', name: 'Sơn tường nội thất', basePrice: 300000, estimatedDurationMinutes: 180, pricingType: 'FROM', description: 'Dặm vá tường bong tróc, nứt chân chim, sơn phủ lại phòng ngủ, phòng khách.' },
    { categorySlug: 'son-sua-nha', slug: 'chong-tham-nha-ve-sinh', name: 'Chống thấm sàn nhà vệ sinh', basePrice: 850000, estimatedDurationMinutes: 300, pricingType: 'FROM', description: 'Quét màng chống thấm polyurethane và lát lại gạch sàn nhà tắm.' },

    // Sửa đồ gia dụng & Diệt côn trùng
    { categorySlug: 'do-gia-dung', slug: 'sua-may-giat', name: 'Sửa máy giặt', basePrice: 180000, estimatedDurationMinutes: 90, pricingType: 'FROM', description: 'Sửa máy giặt không cấp nước, không vắt, rung lắc mạnh khi hoạt động.' },
    { categorySlug: 'diet-con-trung', slug: 'phun-thuoc-diet-muoi', name: 'Phun thuốc diệt muỗi', basePrice: 350000, estimatedDurationMinutes: 60, pricingType: 'FIXED', description: 'Phun thuốc phòng chống muỗi và côn trùng gây hại cho nhà ở dưới 100m2.' },
  ];

  const serviceMap = {};
  for (const s of servicesData) {
    const cat = categoryMap[s.categorySlug];
    if (cat) {
      const saved = await upsert(Service, { slug: s.slug }, {
        category: cat._id,
        name: s.name,
        slug: s.slug,
        basePrice: s.basePrice,
        estimatedDurationMinutes: s.estimatedDurationMinutes,
        pricingType: s.pricingType,
        description: s.description,
        isActive: true,
      });
      serviceMap[s.slug] = saved;
    }
  }

  // =========================================================================
  // 4. PROVIDER PROFILES (With Geolocation & Verification States)
  // =========================================================================
  console.log('4. Seeding Provider Profiles...');
  const catDN = categoryMap['dien-nuoc']._id;
  const catDL = categoryMap['dien-lanh']._id;
  const catDD = categoryMap['don-dep-nha']._id;
  const catSK = categoryMap['sua-khoa']._id;
  const catSS = categoryMap['son-sua-nha']._id;
  const staffId = userMap['staff.demo@homecare.local']._id;

  const profilesData = [
    {
      userEmail: 'provider.demo@homecare.local',
      businessName: 'Điện Nước Phát Đạt',
      bio: 'Thợ lành nghề hơn 6 năm kinh nghiệm sửa chữa hệ thống điện nước và điện lạnh tại khu vực TP.HCM. Cam kết đúng giờ, báo giá minh bạch.',
      yearsOfExperience: 6,
      verificationStatus: 'VERIFIED',
      skills: [catDN, catDL],
      serviceAreas: ['Quận 1', 'Quận 3', 'Bình Thạnh', 'Phú Nhuận'],
      city: 'TP.HCM',
      location: { type: 'Point', coordinates: [106.7009, 10.7769] }, // Bến Nghé, Q1
      averageRating: 4.8,
      reviewCount: 42,
      completedJobCount: 58,
      verifiedBy: staffId,
      verifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Bắt đầu thẩm định hồ sơ', adminId: staffId },
        { action: 'APPROVE', status: 'VERIFIED', note: 'Hồ sơ pháp lý CCCD và chứng chỉ nghề đầy đủ, hợp lệ', adminId: staffId },
      ],
      payoutInfo: { bankName: 'Vietcombank', accountNumber: '0071001234567', accountHolder: 'TRAN PHAT DAT' },
    },
    {
      userEmail: 'provider2.demo@homecare.local',
      businessName: 'Điện Lạnh Minh Thông',
      bio: 'Chuyên gia bảo dưỡng, sửa chữa máy lạnh inverter và máy giặt lồng ngang. Có thiết bị xịt áp lực cao chuyên dụng.',
      yearsOfExperience: 5,
      verificationStatus: 'VERIFIED',
      skills: [catDL],
      serviceAreas: ['Bình Thạnh', 'Gò Vấp', 'Thủ Đức'],
      city: 'TP.HCM',
      location: { type: 'Point', coordinates: [106.7112, 10.8015] }, // Bình Thạnh
      averageRating: 4.9,
      reviewCount: 28,
      completedJobCount: 35,
      verifiedBy: staffId,
      verifiedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Tiếp nhận hồ sơ', adminId: staffId },
        { action: 'APPROVE', status: 'VERIFIED', note: 'Duyệt hồ sơ thợ điện lạnh', adminId: staffId },
      ],
      payoutInfo: { bankName: 'Techcombank', accountNumber: '19034567891011', accountHolder: 'PHAM MINH THONG' },
    },
    {
      userEmail: 'provider3.demo@homecare.local',
      businessName: 'Vệ Sinh Nhà Cửa Ánh Dương',
      bio: 'Đội ngũ vệ sinh chuyên nghiệp, sử dụng hóa chất sinh học an toàn cho sức khỏe trẻ nhỏ và thú cưng.',
      yearsOfExperience: 4,
      verificationStatus: 'VERIFIED',
      skills: [catDD],
      serviceAreas: ['Quận 3', 'Quận 10', 'Quận 1'],
      city: 'TP.HCM',
      location: { type: 'Point', coordinates: [106.6854, 10.7798] }, // Q3
      averageRating: 4.7,
      reviewCount: 19,
      completedJobCount: 24,
      verifiedBy: staffId,
      verifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Bắt đầu duyệt hồ sơ', adminId: staffId },
        { action: 'APPROVE', status: 'VERIFIED', note: 'Duyệt hồ sơ', adminId: staffId },
      ],
    },
    {
      userEmail: 'provider.pending@homecare.local',
      businessName: 'Thợ Khóa Kiến Hùng',
      bio: 'Thợ sửa khóa tận nhà, mở khóa an toàn không hư ổ.',
      yearsOfExperience: 3,
      verificationStatus: 'PENDING',
      skills: [catSK],
      serviceAreas: ['Quận 10', 'Quận 11', 'Quận 5'],
      city: 'TP.HCM',
      location: { type: 'Point', coordinates: [106.6669, 10.7675] },
      documents: [
        { type: 'ID_CARD_FRONT', url: 'https://placehold.co/800x500.png?text=CCCD_Truoc' },
        { type: 'ID_CARD_BACK', url: 'https://placehold.co/800x500.png?text=CCCD_Sau' },
        { type: 'CERTIFICATE', url: 'https://placehold.co/800x600.png?text=Chung_Chi_Khoa' },
      ],
    },
    {
      userEmail: 'provider.review@homecare.local',
      businessName: 'Sơn Sửa Nhà Tuấn Kiệt',
      bio: 'Thợ chuyên sơn tường, chống thấm trần thạch cao.',
      yearsOfExperience: 7,
      verificationStatus: 'UNDER_REVIEW',
      skills: [catSS],
      serviceAreas: ['Phú Nhuận', 'Tân Bình'],
      city: 'TP.HCM',
      location: { type: 'Point', coordinates: [106.6789, 10.7981] },
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Đang đối chiếu thông tin chứng chỉ nghề nghiệp', adminId: staffId },
      ],
    },
    {
      userEmail: 'provider.rejected@homecare.local',
      businessName: 'Sửa Chữa Đồ Gia Dụng Văn Sơn',
      bio: 'Sửa máy giặt, lò vi sóng các loại.',
      yearsOfExperience: 2,
      verificationStatus: 'REJECTED',
      skills: [categoryMap['do-gia-dung']._id],
      serviceAreas: ['Bình Tân'],
      city: 'TP.HCM',
      location: { type: 'Point', coordinates: [106.6052, 10.7512] },
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Kiểm tra giấy tờ', adminId: staffId },
        { action: 'REJECT', status: 'REJECTED', note: 'Hình ảnh CCCD bị mờ, không rõ số căn cước và ngày cấp. Vui lòng chụp lại rõ nét.', adminId: staffId },
      ],
    },
  ];

  for (const p of profilesData) {
    const user = userMap[p.userEmail];
    if (user) {
      await upsert(ProviderProfile, { user: user._id }, {
        user: user._id,
        businessName: p.businessName,
        bio: p.bio,
        yearsOfExperience: p.yearsOfExperience,
        verificationStatus: p.verificationStatus,
        skills: p.skills,
        serviceCategories: p.skills,
        serviceAreas: p.serviceAreas,
        city: p.city,
        location: p.location,
        averageRating: p.averageRating || 0,
        reviewCount: p.reviewCount || 0,
        completedJobCount: p.completedJobCount || 0,
        verifiedBy: p.verifiedBy,
        verifiedAt: p.verifiedAt,
        verificationLogs: p.verificationLogs || [],
        payoutInfo: p.payoutInfo,
        documents: p.documents || [],
        isDeleted: false,
      });
    }
  }

  // =========================================================================
  // 5. AVAILABILITY SCHEDULES
  // =========================================================================
  console.log('5. Seeding Provider Availability Schedules...');
  const weeklyTemplate = Availability.getDefaultWeeklySchedule ? Availability.getDefaultWeeklySchedule() : [
    { dayOfWeek: 1, dayName: 'monday', isOff: false, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 2, dayName: 'tuesday', isOff: false, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 3, dayName: 'wednesday', isOff: false, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 4, dayName: 'thursday', isOff: false, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 5, dayName: 'friday', isOff: false, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 6, dayName: 'saturday', isOff: false, startTime: '08:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 0, dayName: 'sunday', isOff: true, startTime: '08:00', endTime: '12:00', breaks: [] },
  ];

  for (const email of ['provider.demo@homecare.local', 'provider2.demo@homecare.local', 'provider3.demo@homecare.local']) {
    const pUser = userMap[email];
    if (pUser) {
      await upsert(Availability, { provider: pUser._id }, {
        provider: pUser._id,
        weeklySchedule: weeklyTemplate,
        daysOff: [],
      });
    }
  }

  // =========================================================================
  // 6. MEMBERSHIP PLANS, SUBSCRIPTIONS & PAYMENTS
  // =========================================================================
  console.log('6. Seeding Membership Plans & Subscriptions...');
  const plansData = [
    {
      name: 'Gói Cơ Bản (Standard)',
      slug: 'standard',
      monthlyPrice: 199000,
      benefits: ['Nhận không giới hạn yêu cầu', 'Huy hiệu thợ tiêu chuẩn', 'Hỗ trợ kỹ thuật qua chat'],
      isActive: true,
      version: 1,
    },
    {
      name: 'Gói Chuyên Nghiệp (Pro)',
      slug: 'pro',
      monthlyPrice: 499000,
      benefits: ['Ưu tiên hiển thị top 3 gợi ý', 'Huy hiệu thợ Pro uy tín', 'Không tính hoa hồng đơn hàng', 'Báo cáo doanh thu nâng cao'],
      isActive: true,
      version: 1,
    },
    {
      name: 'Gói Doanh Nghiệp (Enterprise)',
      slug: 'enterprise',
      monthlyPrice: 999000,
      benefits: ['Dành cho đội ngũ thợ đông thành viên', 'Quản lý đa thợ phụ', 'Đặc quyền CSKH riêng 24/7'],
      isActive: true,
      version: 1,
    },
  ];

  const planMap = {};
  for (const pl of plansData) {
    const saved = await upsert(MembershipPlan, { slug: pl.slug }, pl);
    planMap[pl.slug] = saved;
  }

  // Subscriptions for active demo providers
  const provDemoUser = userMap['provider.demo@homecare.local'];
  const proPlan = planMap['pro'];
  if (provDemoUser && proPlan) {
    const sub = await upsert(ProviderSubscription, { provider: provDemoUser._id }, {
      provider: provDemoUser._id,
      plan: proPlan._id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    });

    await upsert(MembershipPayment, { orderCode: 2026110301 }, {
      provider: provDemoUser._id,
      subscription: sub._id,
      plan: proPlan._id,
      planVersion: 1,
      planNameSnapshot: proPlan.name,
      amount: proPlan.monthlyPrice,
      currency: 'VND',
      orderCode: 2026110301,
      status: 'PAID',
      paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      appliedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    });
  }

  // =========================================================================
  // 7. SERVICE REQUESTS
  // =========================================================================
  console.log('7. Seeding Service Requests...');
  const c1 = userMap['customer.demo@homecare.local']._id;
  const c2 = userMap['customer2.demo@homecare.local']._id;
  const c3 = userMap['customer3.demo@homecare.local']._id;

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const requestsData = [
    // Req 1: Sửa ống nước rò rỉ (Sắp tới, CONFIRMED booking)
    {
      _id: ID.req(1),
      customer: c1,
      service: serviceMap['sua-ong-nuoc-ro-ri']._id,
      category: categoryMap['dien-nuoc']._id,
      description: 'Ống thoát nước dưới bồn rửa chén bị rò rỉ liên tục, nước rỉ ra sàn bếp. Đã khóa van tạm thời.',
      address: {
        recipientName: 'Nguyễn Thị Thanh',
        phone: '0922222222',
        addressLine: '45 Nguyễn Huệ, Căn 12.05',
        ward: 'Bến Nghé',
        district: 'Quận 1',
        city: 'TP.HCM',
        location: { type: 'Point', coordinates: [106.7032, 10.7745] },
      },
      preferredStartAt: new Date(now + 1 * day + 2 * 3600000),
      preferredEndAt: new Date(now + 1 * day + 4 * 3600000),
      budgetMin: 150000,
      budgetMax: 350000,
      status: 'BOOKED',
    },
    // Req 2: Vệ sinh máy lạnh (Đang thi công, IN_PROGRESS booking)
    {
      _id: ID.req(2),
      customer: c2,
      service: serviceMap['ve-sinh-may-lanh']._id,
      category: categoryMap['dien-lanh']._id,
      description: 'Máy lạnh Panasonic 1.5 HP trong phòng ngủ thổi gió yếu và có mùi ẩm mốc, cần vệ sinh sạch sẽ và đo gas.',
      address: {
        recipientName: 'Trần Minh Khoa',
        phone: '0944444444',
        addressLine: '220 Lê Văn Sỹ',
        ward: 'Phường 14',
        district: 'Quận 3',
        city: 'TP.HCM',
        location: { type: 'Point', coordinates: [106.6789, 10.7892] },
      },
      preferredStartAt: new Date(now - 1 * 3600000),
      preferredEndAt: new Date(now + 2 * 3600000),
      budgetMin: 150000,
      budgetMax: 400000,
      status: 'BOOKED',
    },
    // Req 3: Sửa điện dân dụng (Đã hoàn thành, COMPLETED booking có Review)
    {
      _id: ID.req(3),
      customer: c3,
      service: serviceMap['sua-dien-dan-dung']._id,
      category: categoryMap['dien-nuoc']._id,
      description: 'Bếp từ đang nấu thì aptomat tổng nhảy liên tục, nghi bị chập đường dây âm tường khu vực bếp.',
      address: {
        recipientName: 'Lê Hoàng Nam',
        phone: '0945555555',
        addressLine: '158 Điện Biên Phủ',
        ward: 'Phường 17',
        district: 'Bình Thạnh',
        city: 'TP.HCM',
        location: { type: 'Point', coordinates: [106.7085, 10.7955] },
      },
      preferredStartAt: new Date(now - 5 * day),
      preferredEndAt: new Date(now - 5 * day + 2 * 3600000),
      budgetMin: 200000,
      budgetMax: 600000,
      status: 'BOOKED',
    },
    // Req 4: Dọn dẹp nhà theo giờ (Đã hoàn thành, COMPLETED booking có Complaint)
    {
      _id: ID.req(4),
      customer: c1,
      service: serviceMap['don-dep-nha-theo-gio']._id,
      category: categoryMap['don-dep-nha']._id,
      description: 'Cần dọn dẹp nhà 2 tầng trước khi đón khách cuối tuần: quét mạng nhện, lau kính, vệ sinh 2 nhà vệ sinh.',
      address: {
        recipientName: 'Nguyễn Thị Thanh',
        phone: '0922222222',
        addressLine: '74 Hai Bà Trưng',
        ward: 'Bến Nghé',
        district: 'Quận 1',
        city: 'TP.HCM',
        location: { type: 'Point', coordinates: [106.7018, 10.7788] },
      },
      preferredStartAt: new Date(now - 2 * day),
      preferredEndAt: new Date(now - 2 * day + 3 * 3600000),
      budgetMin: 250000,
      budgetMax: 500000,
      status: 'BOOKED',
    },
    // Req 5: Sơn tường nội thất (Đã hủy, CANCELLED)
    {
      _id: ID.req(5),
      customer: c2,
      service: serviceMap['son-tuong-noi-that']._id,
      category: categoryMap['son-sua-nha']._id,
      description: 'Cần sơn lại mảng tường bị bong tróc do ngấm ẩm từ nhà tắm cạnh bên.',
      address: {
        recipientName: 'Trần Minh Khoa',
        phone: '0944444444',
        addressLine: '12 Phan Xích Long',
        ward: 'Phường 2',
        district: 'Phú Nhuận',
        city: 'TP.HCM',
        location: { type: 'Point', coordinates: [106.6912, 10.7965] },
      },
      preferredStartAt: new Date(now - 7 * day),
      preferredEndAt: new Date(now - 7 * day + 4 * 3600000),
      budgetMin: 500000,
      budgetMax: 1000000,
      status: 'CANCELLED',
      cancellationReason: 'Khách hàng có chuyến công tác đột xuất',
      cancelledBy: c2,
      cancelledAt: new Date(now - 7 * day + 1800000),
    },
    // Req 6: Mở khóa tại nhà (Đang tìm thợ OPEN, có AI Analysis)
    {
      _id: ID.req(6),
      customer: c3,
      service: serviceMap['mo-khoa-tai-nha']._id,
      category: categoryMap['sua-khoa']._id,
      description: 'Cửa phòng ngủ tay gạt bị kẹt then khóa bên trong, không vặn mở được. Cần thợ hỗ trợ gấp.',
      address: {
        recipientName: 'Lê Hoàng Nam',
        phone: '0945555555',
        addressLine: '88 Pasteur',
        ward: 'Bến Nghé',
        district: 'Quận 1',
        city: 'TP.HCM',
        location: { type: 'Point', coordinates: [106.7001, 10.7735] },
      },
      preferredStartAt: new Date(now + 2 * 3600000),
      preferredEndAt: new Date(now + 4 * 3600000),
      budgetMin: 150000,
      budgetMax: 300000,
      status: 'OPEN',
      aiAnalysis: {
        summary: 'Kẹt chốt khóa lưỡi gà cửa tay gạt phòng ngủ',
        suspectedIssue: 'Gãy lò xo hồi vị hoặc kẹt dị vật trong lõi khóa',
        urgency: 'HIGH',
        estimatedPriceMin: 150000,
        estimatedPriceMax: 250000,
        suggestedTools: ['Bộ mở khóa chuyên dụng', 'Kìm mỏ nhọn', 'Bình xịt bôi trơn RP7'],
        recommendations: ['Không tự ý dùng búa đập mạnh làm biến dạng khung nhôm kính'],
        confidence: 0.92,
        analyzedAt: new Date(),
      },
    },
    // Req 7: Lắp đặt bồn cầu (Đang tìm thợ OPEN)
    {
      _id: ID.req(7),
      customer: c1,
      service: serviceMap['lap-dat-bon-cau']._id,
      category: categoryMap['dien-nuoc']._id,
      description: 'Thay bồn cầu cũ bằng bồn cầu thông minh mới mua, cần thợ có tay nghề căn chỉnh gioăng cao su chống hôi.',
      address: {
        recipientName: 'Nguyễn Thị Thanh',
        phone: '0922222222',
        addressLine: '12 Bến Vân Đồn',
        ward: 'Phường 12',
        district: 'Quận 4',
        city: 'TP.HCM',
        location: { type: 'Point', coordinates: [106.7025, 10.7654] },
      },
      preferredStartAt: new Date(now + 2 * day),
      preferredEndAt: new Date(now + 2 * day + 3 * 3600000),
      budgetMin: 350000,
      budgetMax: 600000,
      status: 'OPEN',
    },
    // Req 8: Phun thuốc diệt muỗi (Đang tìm thợ OPEN)
    {
      _id: ID.req(8),
      customer: c2,
      service: serviceMap['phun-thuoc-diet-muoi']._id,
      category: categoryMap['diet-con-trung']._id,
      description: 'Phun thuốc diệt muỗi định kỳ cho nhà phố 3 tầng (khoảng 120m2 sàn), yêu cầu thuốc không mùi độc hại.',
      address: {
        recipientName: 'Trần Minh Khoa',
        phone: '0944444444',
        addressLine: '54 Cách Mạng Tháng 8',
        ward: 'Phường 6',
        district: 'Quận 3',
        city: 'TP.HCM',
        location: { type: 'Point', coordinates: [106.6901, 10.7761] },
      },
      preferredStartAt: new Date(now + 3 * day),
      preferredEndAt: new Date(now + 3 * day + 2 * 3600000),
      budgetMin: 350000,
      budgetMax: 500000,
      status: 'OPEN',
    },
  ];

  for (const r of requestsData) {
    await upsert(ServiceRequest, { _id: r._id }, r);
  }

  // =========================================================================
  // 8. BOOKINGS MATRIX
  // =========================================================================
  console.log('8. Seeding Bookings...');
  const p1 = userMap['provider.demo@homecare.local']._id;
  const p2 = userMap['provider2.demo@homecare.local']._id;
  const p3 = userMap['provider3.demo@homecare.local']._id;

  const bookingsData = [
    // Booking 1: CONFIRMED (Sắp tới, thợ Phát Đạt)
    {
      _id: ID.booking(1),
      request: ID.req(1),
      customer: c1,
      provider: p1,
      service: serviceMap['sua-ong-nuoc-ro-ri']._id,
      scheduledStartAt: new Date(now + 1 * day + 2 * 3600000),
      scheduledEndAt: new Date(now + 1 * day + 4 * 3600000),
      address: requestsData[0].address,
      price: 250000,
      status: 'CONFIRMED',
      paymentStatus: 'UNPAID',
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: p1, note: 'Thợ Phát Đạt đã tiếp nhận đơn và xác nhận giờ hẹn' },
      ],
    },
    // Booking 2: IN_PROGRESS (Đang làm, có vật tư bổ sung)
    {
      _id: ID.booking(2),
      request: ID.req(2),
      customer: c2,
      provider: p2,
      service: serviceMap['ve-sinh-may-lanh']._id,
      scheduledStartAt: new Date(now - 1 * 3600000),
      scheduledEndAt: new Date(now + 2 * 3600000),
      address: requestsData[1].address,
      price: 150000,
      status: 'IN_PROGRESS',
      paymentStatus: 'PENDING',
      startedAt: new Date(now - 45 * 60000),
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: p2, note: 'Thợ xác nhận nhận việc' },
        { from: 'CONFIRMED', to: 'PROVIDER_ON_THE_WAY', changedBy: p2, note: 'Thợ đang trên đường tới' },
        { from: 'PROVIDER_ON_THE_WAY', to: 'ARRIVED', changedBy: p2, note: 'Thợ đã có mặt tại địa chỉ' },
        { from: 'ARRIVED', to: 'IN_PROGRESS', changedBy: p2, note: 'Bắt đầu tháo lồng vệ sinh máy lạnh' },
      ],
      materials: [
        {
          name: 'Nạp bổ sung gas R32 (20 PSI)',
          quantity: 1,
          price: 180000,
          note: 'Áp suất gas thực tế bị hụt còn 110 PSI, cần nạp thêm để máy lạnh sâu',
          approvalStatus: 'APPROVED',
          addedBy: p2,
          decidedAt: new Date(now - 20 * 60000),
        },
      ],
      additionalFees: 180000,
    },
    // Booking 3: COMPLETED & PAID (Hoàn thành 5 ngày trước, có Review)
    {
      _id: ID.booking(3),
      request: ID.req(3),
      customer: c3,
      provider: p1,
      service: serviceMap['sua-dien-dan-dung']._id,
      scheduledStartAt: new Date(now - 5 * day),
      scheduledEndAt: new Date(now - 5 * day + 2 * 3600000),
      address: requestsData[2].address,
      price: 350000,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt: new Date(now - 5 * day + 1.5 * 3600000),
      completionNote: 'Đã tìm ra điểm chập ở mối nối hộp kỹ thuật, cách điện lại bằng băng keo 3M và thay aptomat 32A mới.',
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: p1, note: 'Xác nhận đơn hàng' },
        { from: 'CONFIRMED', to: 'IN_PROGRESS', changedBy: p1, note: 'Tiến hành đo đạc điện áp' },
        { from: 'IN_PROGRESS', to: 'COMPLETED', changedBy: p1, note: 'Khắc phục hoàn tất sự cố' },
      ],
    },
    // Booking 4: COMPLETED & PAID (Hoàn thành 2 ngày trước, có Complaint)
    {
      _id: ID.booking(4),
      request: ID.req(4),
      customer: c1,
      provider: p3,
      service: serviceMap['don-dep-nha-theo-gio']._id,
      scheduledStartAt: new Date(now - 2 * day),
      scheduledEndAt: new Date(now - 2 * day + 3 * 3600000),
      address: requestsData[3].address,
      price: 300000,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt: new Date(now - 2 * day + 3.5 * 3600000),
      completionNote: 'Đã hoàn tất lau dọn toàn bộ nhà 2 tầng.',
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: p3, note: 'Đã nhận lịch' },
        { from: 'CONFIRMED', to: 'IN_PROGRESS', changedBy: p3, note: 'Bắt đầu làm việc' },
        { from: 'IN_PROGRESS', to: 'COMPLETED', changedBy: p3, note: 'Hoàn thành công việc' },
      ],
    },
    // Booking 5: CANCELLED (Đã hủy)
    {
      _id: ID.booking(5),
      request: ID.req(5),
      customer: c2,
      provider: p1,
      service: serviceMap['son-tuong-noi-that']._id,
      scheduledStartAt: new Date(now - 7 * day),
      scheduledEndAt: new Date(now - 7 * day + 4 * 3600000),
      address: requestsData[4].address,
      price: 600000,
      status: 'CANCELLED',
      paymentStatus: 'UNPAID',
      cancelledBy: 'CUSTOMER',
      cancelReason: 'Khách hàng có chuyến công tác đột xuất',
      cancellationReason: 'Khách hàng có chuyến công tác đột xuất',
      cancelledAt: new Date(now - 7 * day + 1800000),
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: p1, note: 'Đã nhận lịch' },
        { from: 'CONFIRMED', to: 'CANCELLED', changedBy: c2, note: 'Khách hàng hủy đơn' },
      ],
    },
  ];

  for (const b of bookingsData) {
    await upsert(Booking, { _id: b._id }, b);
  }

  // =========================================================================
  // 9. REVIEWS & RATINGS
  // =========================================================================
  console.log('9. Seeding Reviews...');
  const reviewsData = [
    {
      _id: ID.review(1),
      booking: ID.booking(3),
      customer: c3,
      provider: p1,
      rating: 5,
      comment: 'Anh Đạt rất nhiệt tình và chuyên nghiệp! Tìm ra điểm chập điện rất nhanh, giải thích rõ ràng và có tâm. Sẽ tiếp tục ủng hộ khi cần.',
      response: 'Dạ em cảm ơn anh Nam đã tin tưởng ủng hộ dịch vụ! Chúc gia đình anh nhiều sức khỏe.',
      isVisible: true,
    },
    {
      _id: ID.review(2),
      booking: ID.booking(4),
      customer: c1,
      provider: p3,
      rating: 4,
      comment: 'Dọn dẹp nhà tương đối sạch sẽ, có mang theo máy hút bụi mini. Chỉ có điều thợ đến muộn khoảng 25 phút so với giờ hẹn.',
      response: 'Dạ cảm ơn chị Thanh đã đóng góp ý kiến. Lần sau bên em sẽ xuất phát sớm hơn để tránh giờ cao điểm ạ.',
      isVisible: true,
    },
  ];

  for (const r of reviewsData) {
    await upsert(Review, { _id: r._id }, r);
  }

  // =========================================================================
  // 10. COMPLAINTS & ARBITRATION
  // =========================================================================
  console.log('10. Seeding Complaints...');
  const complaintsData = [
    {
      _id: ID.complaint(1),
      booking: ID.booking(4),
      reporter: c1,
      against: p3,
      category: 'LATE_ARRIVAL',
      title: 'Thợ đến trễ 45 phút so với lịch hẹn',
      description: 'Tôi đã đặt lịch lúc 09:00 sáng để kịp đón xe chuyển đồ lúc 11:30. Tuy nhiên thợ tới muộn hơn 45 phút mà không gọi điện báo trước, làm ảnh hưởng nghiêm trọng đến kế hoạch của gia đình.',
      status: 'UNDER_REVIEW',
      replies: [
        {
          sender: c1,
          senderRole: 'CUSTOMER',
          message: 'Tôi yêu cầu hệ thống nhắc nhở nghiêm túc và có chính sách kiểm soát giờ giấc của thợ.',
          createdAt: new Date(now - 1.5 * day),
        },
        {
          sender: p3,
          senderRole: 'PROVIDER',
          message: 'Dạ thành thật xin lỗi chị Thanh, do sáng hôm đó tuyến đường Hai Bà Trưng bị phong tỏa vì sự cố ngập nước, em có cố gắng gọi nhưng máy bận. Em xin rút kinh nghiệm sâu sắc ạ.',
          createdAt: new Date(now - 1 * day),
        },
        {
          sender: staffId,
          senderRole: 'STAFF',
          message: 'Nhân viên CSKH đã tiếp nhận phản hồi từ hai bên. Hệ thống sẽ ghi nhận vi phạm giờ giấc của đối tác thợ và hỗ trợ voucher ưu đãi 15% cho chị Thanh trong lần đặt lịch kế tiếp.',
          createdAt: new Date(now - 12 * 3600000),
        },
      ],
    },
    {
      _id: ID.complaint(2),
      booking: ID.booking(3),
      reporter: c3,
      against: p1,
      category: 'PRICE',
      title: 'Thắc mắc chi phí thay mới aptomat',
      description: 'Khách hàng muốn làm rõ hóa đơn linh kiện aptomat 32A đã thay thế.',
      status: 'RESOLVED',
      resolutionNote: 'Nhân viên CSKH đã đối chiếu tem bảo hành chính hãng Schneider và hóa đơn mua lẻ của thợ. Khách hàng đã hiểu rõ và đồng thuận đóng khiếu nại.',
      resolvedBy: staffId,
      resolvedAt: new Date(now - 4 * day),
    },
  ];

  for (const comp of complaintsData) {
    await upsert(Complaint, { _id: comp._id }, comp);
  }

  // =========================================================================
  // 11. NOTIFICATIONS
  // =========================================================================
  console.log('11. Seeding Notifications...');
  const notificationsData = [
    {
      recipient: c1,
      type: 'BOOKING_CONFIRMED',
      title: 'Thợ đã tiếp nhận đơn hàng!',
      message: 'Thợ Trần Phát Đạt đã xác nhận lịch hẹn sửa ống nước rò rỉ vào ngày mai lúc 14:00.',
      resourceType: 'BOOKING',
      resourceId: ID.booking(1),
      readAt: new Date(),
    },
    {
      recipient: c2,
      type: 'MATERIALS_PENDING_APPROVAL',
      title: 'Yêu cầu duyệt vật tư phát sinh',
      message: 'Thợ Phạm Minh Thông yêu cầu bổ sung vật tư nạp gas R32 (180.000đ). Vui lòng kiểm tra và phê duyệt.',
      resourceType: 'BOOKING',
      resourceId: ID.booking(2),
      readAt: null,
    },
    {
      recipient: p1,
      type: 'BOOKING_STATUS_UPDATED',
      title: 'Đơn hàng hoàn tất & Đánh giá 5 sao',
      message: 'Khách hàng Lê Hoàng Nam đã đánh giá 5 sao cho dịch vụ sửa điện dân dụng của bạn.',
      resourceType: 'BOOKING',
      resourceId: ID.booking(3),
      readAt: new Date(),
    },
    {
      recipient: staffId,
      type: 'BOOKING_STATUS_UPDATED',
      title: 'Hồ sơ thợ mới chờ duyệt',
      message: 'Thợ Lý Kiến Hùng vừa nộp hồ sơ xin gia nhập nền tảng. Vui lòng thẩm định tại danh sách xét duyệt.',
      resourceType: 'REQUEST',
      readAt: null,
    },
  ];

  for (const n of notificationsData) {
    await upsert(Notification, {
      recipient: n.recipient,
      title: n.title,
    }, n);
  }

  // =========================================================================
  // 12. FINANCIAL PAYMENTS (FOR REVENUE REPORTING DASHBOARD)
  // =========================================================================
  console.log('12. Seeding Revenue Payments (Last 30 Days)...');
  const revenuePayments = [
    { booking: ID.booking(3), customer: c3, provider: p1, amount: 350000, method: 'VNPAY', status: 'PAID', transactionId: 'TXN_VNPAY_1001', paidAt: new Date(now - 5 * day) },
    { booking: ID.booking(4), customer: c1, provider: p3, amount: 300000, method: 'MOMO', status: 'PAID', transactionId: 'TXN_MOMO_1002', paidAt: new Date(now - 2 * day) },
    // Historical payments spread across the last 4 weeks to create rich graphs
    { booking: ID.booking(3), customer: c2, provider: p1, amount: 450000, method: 'BANK_TRANSFER', status: 'PAID', transactionId: 'TXN_HIST_1003', paidAt: new Date(now - 8 * day) },
    { booking: ID.booking(3), customer: c1, provider: p2, amount: 280000, method: 'VNPAY', status: 'PAID', transactionId: 'TXN_HIST_1004', paidAt: new Date(now - 12 * day) },
    { booking: ID.booking(4), customer: c3, provider: p1, amount: 520000, method: 'MOMO', status: 'PAID', transactionId: 'TXN_HIST_1005', paidAt: new Date(now - 15 * day) },
    { booking: ID.booking(3), customer: c2, provider: p3, amount: 390000, method: 'VNPAY', status: 'PAID', transactionId: 'TXN_HIST_1006', paidAt: new Date(now - 19 * day) },
    { booking: ID.booking(4), customer: c1, provider: p1, amount: 650000, method: 'BANK_TRANSFER', status: 'PAID', transactionId: 'TXN_HIST_1007', paidAt: new Date(now - 23 * day) },
    { booking: ID.booking(3), customer: c3, provider: p2, amount: 420000, method: 'MOMO', status: 'PAID', transactionId: 'TXN_HIST_1008', paidAt: new Date(now - 27 * day) },
  ];

  for (const pay of revenuePayments) {
    await upsert(Payment, { transactionId: pay.transactionId }, pay);
  }

  console.log('\n=================================================================');
  console.log('FULL PROJECT SEED COMPLETED SUCCESSFULLY!');
  console.log('=================================================================');
  console.log('Demo Accounts:');
  console.log('  Admin    : admin@homecare.local        / ChangeMe123!');
  console.log('  Admin    : admin.demo@homecare.local   / Demo123!');
  console.log('  Staff    : staff.demo@homecare.local   / Demo123!');
  console.log('  Staff    : staff2.demo@homecare.local  / Demo123!');
  console.log('  Provider : provider.demo@homecare.local / Demo123! (VERIFIED, Dien Nuoc & Dien Lanh)');
  console.log('  Provider : provider2.demo@homecare.local / Demo123! (VERIFIED, Dien Lanh Pro)');
  console.log('  Provider : provider3.demo@homecare.local / Demo123! (VERIFIED, Ve Sinh)');
  console.log('  Provider : provider.pending@homecare.local / Demo123! (PENDING Verification)');
  console.log('  Provider : provider.review@homecare.local / Demo123! (UNDER_REVIEW Verification)');
  console.log('  Provider : provider.rejected@homecare.local / Demo123! (REJECTED Verification)');
  console.log('  Customer : customer.demo@homecare.local / Demo123!');
  console.log('  Customer : customer2.demo@homecare.local / Demo123!');
  console.log('  Customer : customer3.demo@homecare.local / Demo123!');
  console.log('=================================================================');
  console.log('Entities Seeded:');
  console.log(`  - Users: ${usersData.length}`);
  console.log(`  - Categories: ${categoriesData.length}`);
  console.log(`  - Services: ${servicesData.length}`);
  console.log(`  - Provider Profiles: ${profilesData.length}`);
  console.log(`  - Membership Plans: ${plansData.length}`);
  console.log(`  - Service Requests: ${requestsData.length}`);
  console.log(`  - Bookings: ${bookingsData.length}`);
  console.log(`  - Reviews: ${reviewsData.length}`);
  console.log(`  - Complaints: ${complaintsData.length}`);
  console.log(`  - Notifications: ${notificationsData.length}`);
  console.log(`  - Revenue Payments: ${revenuePayments.length}`);
  console.log('=================================================================\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  seedFullProject().catch((err) => {
    console.error('Full seed failed with error:', err);
    process.exit(1);
  });
}

module.exports = { seedFullProject };

