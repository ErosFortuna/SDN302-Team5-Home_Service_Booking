/**
 * Database Reset and Da Nang Seeding Script
 *
 * Requirements:
 * 1. Wipe all data from the database except existing users in the `users` collection.
 * 2. Update all existing users with realistic addresses in Da Nang.
 * 3. Seed comprehensive, realistic sample data located in Da Nang matching current code:
 *    - Master catalog: Service Categories & Services
 *    - Provider Profiles: all in Da Nang with geo-coordinates, verified/pending/under_review/rejected statuses
 *    - Provider Availability schedules
 *    - Membership Plans, Subscriptions & Payments
 *    - Service Requests (OPEN, BOOKED, CANCELLED) with Da Nang addresses
 *    - Bookings (PENDING_CONFIRMATION, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED) with Da Nang addresses
 *    - Reviews (5-star ratings & provider replies)
 *    - Complaints (OPEN with dialogue replies for Staff arbitration, RESOLVED with resolution note)
 *    - System Notifications
 *    - Revenue Payments for Admin reporting
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const mongoose = require('mongoose');
const { connectDB } = require('../config/db.js');
const { isOwnedProviderDocument } = require('../shared/validators.js');

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

// Deterministic ObjectIds for clean relations
const ID = {
  req: (n) => new mongoose.Types.ObjectId(`66f2000000000000000000${String(n).padStart(2, '0')}`),
  booking: (n) => new mongoose.Types.ObjectId(`66f3000000000000000000${String(n).padStart(2, '0')}`),
  complaint: (n) => new mongoose.Types.ObjectId(`66f4000000000000000000${String(n).padStart(2, '0')}`),
  review: (n) => new mongoose.Types.ObjectId(`66f5000000000000000000${String(n).padStart(2, '0')}`),
};

const DANANG_DISTRICTS = ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Cẩm Lệ', 'Liên Chiểu'];

// Da Nang address mapping for the 22 existing users
const USER_DANANG_ADDRESSES = {
  // Admins
  'admin@homecare.local': '01 Bạch Đằng, Phường Thạch Thang, Quận Hải Châu, Đà Nẵng',
  'admin.demo@homecare.local': '15 Trần Phú, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng',

  // Staff
  'staff.demo@homecare.local': '42 Lê Duẩn, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng',
  'staff2.demo@homecare.local': '86 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, Đà Nẵng',
  'binh222120@gmail.com': '120 Nguyễn Tri Phương, Phường Chính Gián, Quận Thanh Khê, Đà Nẵng',

  // Providers
  'provider.demo@homecare.local': '158 Bạch Đằng, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng',
  'provider2.demo@homecare.local': '245 Điện Biên Phủ, Phường Chính Gián, Quận Thanh Khê, Đà Nẵng',
  'provider3.demo@homecare.local': '88 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, Đà Nẵng',
  'nam@gmail.com': '36 Ngũ Hành Sơn, Phường Mỹ An, Quận Ngũ Hành Sơn, Đà Nẵng',
  'quoctest@gmail.com': '55 Cách Mạng Tháng 8, Phường Khuê Trung, Quận Cẩm Lệ, Đà Nẵng',
  'nashona315@gmail.com': '102 Nguyễn Lương Bằng, Phường Hòa Khánh Bắc, Quận Liên Chiểu, Đà Nẵng',
  'provider.pending@homecare.local': '77 Hùng Vương, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng',
  'provider.review@homecare.local': '34 Hà Huy Tập, Phường Xuân Hà, Quận Thanh Khê, Đà Nẵng',
  'provider.rejected@homecare.local': '92 Tôn Đức Thắng, Phường Hòa Minh, Quận Liên Chiểu, Đà Nẵng',

  // Customers
  'customer.demo@homecare.local': '25 Quang Trung, Phường Thạch Thang, Quận Hải Châu, Đà Nẵng',
  'customer2.demo@homecare.local': '68 Hoàng Hoa Thám, Phường Tân Chính, Quận Thanh Khê, Đà Nẵng',
  'customer3.demo@homecare.local': '12 Phạm Văn Đồng, Phường An Hải Bắc, Quận Sơn Trà, Đà Nẵng',
  'customer@test.com': '50 Lê Lợi, Phường Thạch Thang, Quận Hải Châu, Đà Nẵng',
  'hoangquoc315@gmail.com': '18 Hồ Xuân Hương, Phường Mỹ An, Quận Ngũ Hành Sơn, Đà Nẵng',
  'phongndde170408@fpt.edu.vn': 'Khu đô thị FPT City, Phường Hòa Hải, Quận Ngũ Hành Sơn, Đà Nẵng',
  'quoc@gmail.com': '29 Trần Hưng Đạo, Phường An Hải Tây, Quận Sơn Trà, Đà Nẵng',
  'datlqde181031@fpt.edu.vn': '29 Trần Hưng Đạo, Phường An Hải Tây, Quận Sơn Trà, Đà Nẵng',
};

async function resetAndSeedDaNang() {
  console.log('--- STARTING DATABASE RESET & DA NANG SEED ---');
  await connectDB();

  // =========================================================================
  // STEP 1: WIPE ALL NON-USER COLLECTIONS
  // =========================================================================
  console.log('1. Clearing non-user collections (preserving User collection)...');
  await Promise.all([
    ServiceRequest.deleteMany({}),
    Booking.deleteMany({}),
    Complaint.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
    Payment.deleteMany({}),
    MembershipPayment.deleteMany({}),
    ProviderSubscription.deleteMany({}),
    Availability.deleteMany({}),
    ProviderProfile.deleteMany({}),
    ServiceCategory.deleteMany({}),
    Service.deleteMany({}),
    MembershipPlan.deleteMany({}),
  ]);

  // Clean quotes collection if it exists
  try {
    await mongoose.connection.db.collection('quotes').deleteMany({});
  } catch (e) {
    // Ignore if collection does not exist
  }
  console.log('   All transactional, catalog, and provider data cleared.');

  // =========================================================================
  // STEP 2: UPDATE ALL USERS WITH DA NANG ADDRESSES
  // =========================================================================
  console.log('2. Updating addresses to Da Nang for all existing users...');
  const users = await User.find({});
  console.log(`   Found ${users.length} users in database.`);

  let fallbackDistrictIdx = 0;
  for (const user of users) {
    const daNangAddress =
      USER_DANANG_ADDRESSES[user.email] ||
      `Số ${Math.floor(Math.random() * 200) + 1} Đường Nguyễn Văn Linh, Quận ${DANANG_DISTRICTS[fallbackDistrictIdx++ % DANANG_DISTRICTS.length]}, Đà Nẵng`;

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          address: daNangAddress,
          emailVerified: true,
          status: 'ACTIVE',
        },
      }
    );
  }
  console.log('   Successfully updated all users to Da Nang addresses.');

  // Reload user map for relationships
  const allUsers = await User.find({});
  const userMap = {};
  for (const u of allUsers) {
    userMap[u.email] = u;
  }

  // =========================================================================
  // STEP 3: SEED SERVICE CATEGORIES (8 Categories)
  // =========================================================================
  console.log('3. Seeding Service Categories...');
  const categoriesData = [
    { slug: 'dien-nuoc', name: 'Điện nước', icon: 'droplets', pricingMode: 'FIXED', sortOrder: 1, description: 'Sửa chữa, lắp đặt hệ thống điện và đường ống nước dân dụng tại Đà Nẵng.' },
    { slug: 'dien-lanh', name: 'Điện lạnh', icon: 'snowflake', pricingMode: 'FIXED', sortOrder: 2, description: 'Sửa chữa, bảo dưỡng máy lạnh, tủ lạnh, máy nước nóng tại Đà Nẵng.' },
    { slug: 'don-dep-nha', name: 'Dọn dẹp nhà', icon: 'sparkles', pricingMode: 'FIXED', sortOrder: 3, description: 'Dọn dẹp theo giờ, tổng vệ sinh định kỳ hoặc sau chuyển nhà.' },
    { slug: 'sua-khoa', name: 'Sửa khóa', icon: 'key', pricingMode: 'FIXED', sortOrder: 4, description: 'Mở khóa tận nơi, thay ổ khóa, lắp khóa điện tử thông minh.' },
    { slug: 'son-sua-nha', name: 'Sơn sửa nhà', icon: 'paintbrush', pricingMode: 'FIXED', sortOrder: 5, description: 'Sơn tường, chống thấm trần thạch cao, sửa chữa cải tạo nhà.' },
    { slug: 'do-gia-dung', name: 'Sửa đồ gia dụng', icon: 'washing-machine', pricingMode: 'FIXED', sortOrder: 6, description: 'Sửa máy giặt, lò vi sóng, bếp từ và thiết bị gia dụng khác.' },
    { slug: 'diet-con-trung', name: 'Diệt côn trùng', icon: 'bug', pricingMode: 'FIXED', sortOrder: 7, description: 'Phun thuốc diệt muỗi, gián, mối kiểm soát sinh vật gây hại.' },
    { slug: 'chuyen-nha', name: 'Chuyển nhà trọn gói', icon: 'truck', pricingMode: 'FIXED', sortOrder: 8, isActive: false, description: 'Đóng gói, vận chuyển đồ đạc (tạm ngừng cung cấp).' },
  ];

  const categoryMap = {};
  for (const cat of categoriesData) {
    const created = await ServiceCategory.create({
      ...cat,
      isActive: cat.isActive !== false,
    });
    categoryMap[cat.slug] = created;
  }
  console.log(`   Seeded ${Object.keys(categoryMap).length} categories.`);

  // =========================================================================
  // STEP 4: SEED SERVICES (15 Services)
  // =========================================================================
  console.log('4. Seeding Services...');
  const servicesData = [
    // Điện nước
    { categorySlug: 'dien-nuoc', slug: 'sua-ong-nuoc-ro-ri', name: 'Sửa ống nước rò rỉ', basePrice: 150000, estimatedDurationMinutes: 60, pricingType: 'FIXED', description: 'Khắc phục rò rỉ đường ống nước, van khóa, vòi sen, vòi lavabo.' },
    { categorySlug: 'dien-nuoc', slug: 'sua-dien-dan-dung', name: 'Sửa điện dân dụng', basePrice: 120000, estimatedDurationMinutes: 60, pricingType: 'FROM', description: 'Xử lý sự cố chập điện, nhảy aptomat, thay mới ổ cắm và công tắc.' },
    { categorySlug: 'dien-nuoc', slug: 'lap-dat-bon-cau', name: 'Lắp đặt & thay bồn cầu', basePrice: 350000, estimatedDurationMinutes: 120, pricingType: 'FIXED', description: 'Tháo lắp, căn chỉnh đường ống cấp thoát cho bồn cầu nguyên khối hoặc rời.' },

    // Điện lạnh
    { categorySlug: 'dien-lanh', slug: 've-sinh-may-lanh', name: 'Vệ sinh máy lạnh', basePrice: 150000, estimatedDurationMinutes: 60, pricingType: 'FIXED', description: 'Vệ sinh lưới lọc, xịt rửa dàn nóng, dàn lạnh, kiểm tra lượng gas.' },
    { categorySlug: 'dien-lanh', slug: 'sua-may-lanh', name: 'Sửa máy lạnh', basePrice: 200000, estimatedDurationMinutes: 90, pricingType: 'FROM', description: 'Kiểm tra máy lạnh không lạnh, chảy nước trong phòng, quạt kêu to.' },
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
    { categorySlug: 'dien-nuoc', slug: 'lap-may-nuoc-nong', name: 'Lắp đặt máy nước nóng trực tiếp / gián tiếp', basePrice: 220000, estimatedDurationMinutes: 60, pricingType: 'FIXED', description: 'Lắp đặt máy nước nóng, đấu nối CB chống giật ELCB an toàn.' },
  ];

  const serviceMap = {};
  for (const s of servicesData) {
    const cat = categoryMap[s.categorySlug];
    if (cat) {
      const created = await Service.create({
        category: cat._id,
        name: s.name,
        slug: s.slug,
        basePrice: s.basePrice,
        estimatedDurationMinutes: s.estimatedDurationMinutes,
        pricingType: s.pricingType,
        description: s.description,
        isActive: true,
      });
      serviceMap[s.slug] = created;
    }
  }
  console.log(`   Seeded ${Object.keys(serviceMap).length} services.`);

  // =========================================================================
  // STEP 5: SEED PROVIDER PROFILES (All Centered in Da Nang)
  // =========================================================================
  console.log('5. Seeding Provider Profiles in Da Nang...');
  const catDN = categoryMap['dien-nuoc']._id;
  const catDL = categoryMap['dien-lanh']._id;
  const catDD = categoryMap['don-dep-nha']._id;
  const catSK = categoryMap['sua-khoa']._id;
  const catSS = categoryMap['son-sua-nha']._id;
  const catDGD = categoryMap['do-gia-dung']._id;

  const staffUser = userMap['staff.demo@homecare.local'];
  const staffId = staffUser ? staffUser._id : null;

  const providerProfilesData = [
    // 1. provider.demo - Verified main demo provider
    {
      email: 'provider.demo@homecare.local',
      businessName: 'Điện Nước Phát Đạt Đà Nẵng',
      bio: 'Thợ lành nghề hơn 6 năm kinh nghiệm sửa chữa hệ thống điện nước và điện lạnh tại Đà Nẵng. Cam kết đúng giờ, báo giá minh bạch, linh kiện chính hãng.',
      yearsOfExperience: 6,
      verificationStatus: 'VERIFIED',
      skills: [catDN, catDL],
      serviceAreas: DANANG_DISTRICTS,
      city: 'Đà Nẵng',
      location: { type: 'Point', coordinates: [108.2208, 16.0678] }, // Hải Châu
      averageRating: 4.9,
      reviewCount: 48,
      completedJobCount: 65,
      verifiedBy: staffId,
      verifiedAt: new Date(Date.now() - 60 * 86400000),
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Tiếp nhận hồ sơ đăng ký thợ tại Đà Nẵng', adminId: staffId },
        { action: 'APPROVE', status: 'VERIFIED', note: 'Hồ sơ pháp lý CCCD và chứng chỉ nghề điện nước đầy đủ, hợp lệ', adminId: staffId },
      ],
      payoutInfo: { bankName: 'Vietcombank Đà Nẵng', accountNumber: '0041001234567', accountHolder: 'TRAN PHAT DAT' },
    },
    // 2. provider2.demo - Verified AC specialist
    {
      email: 'provider2.demo@homecare.local',
      businessName: 'Điện Lạnh Minh Thông Đà Nẵng',
      bio: 'Chuyên gia bảo dưỡng, sửa chữa máy lạnh inverter và máy giặt lồng ngang tại khu vực Thanh Khê, Hải Châu, Liên Chiểu. Thiết bị xịt áp lực cao chuyên dụng.',
      yearsOfExperience: 5,
      verificationStatus: 'VERIFIED',
      skills: [catDL],
      serviceAreas: ['Thanh Khê', 'Hải Châu', 'Liên Chiểu', 'Cẩm Lệ'],
      city: 'Đà Nẵng',
      location: { type: 'Point', coordinates: [108.1884, 16.0620] }, // Thanh Khê
      averageRating: 4.8,
      reviewCount: 32,
      completedJobCount: 40,
      verifiedBy: staffId,
      verifiedAt: new Date(Date.now() - 45 * 86400000),
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Tiếp nhận hồ sơ', adminId: staffId },
        { action: 'APPROVE', status: 'VERIFIED', note: 'Duyệt hồ sơ thợ điện lạnh', adminId: staffId },
      ],
      payoutInfo: { bankName: 'Techcombank Đà Nẵng', accountNumber: '19034567891011', accountHolder: 'PHAM MINH THONG' },
    },
    // 3. provider3.demo - Verified Cleaning provider
    {
      email: 'provider3.demo@homecare.local',
      businessName: 'Vệ Sinh Nhà Cửa Ánh Dương Đà Nẵng',
      bio: 'Đội ngũ vệ sinh nhà ở chuyên nghiệp khu vực Sơn Trà - Ngũ Hành Sơn, sử dụng hóa chất sinh học thân thiện với môi trường, an toàn cho trẻ nhỏ.',
      yearsOfExperience: 4,
      verificationStatus: 'VERIFIED',
      skills: [catDD],
      serviceAreas: ['Sơn Trà', 'Ngũ Hành Sơn', 'Hải Châu'],
      city: 'Đà Nẵng',
      location: { type: 'Point', coordinates: [108.2415, 16.0712] }, // Sơn Trà
      averageRating: 4.7,
      reviewCount: 25,
      completedJobCount: 30,
      verifiedBy: staffId,
      verifiedAt: new Date(Date.now() - 30 * 86400000),
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Bắt đầu duyệt hồ sơ', adminId: staffId },
        { action: 'APPROVE', status: 'VERIFIED', note: 'Duyệt hồ sơ', adminId: staffId },
      ],
      payoutInfo: { bankName: 'MB Bank Đà Nẵng', accountNumber: '0888123456789', accountHolder: 'VO ANH DUONG' },
    },
    // 4. nam@gmail.com - Verified Electric/Lock provider
    {
      email: 'nam@gmail.com',
      businessName: 'Điện Nước & Sửa Khóa Nguyễn Nam',
      bio: 'Thợ lành nghề tại Ngũ Hành Sơn và Sơn Trà. Chuyên xử lý nhanh sự cố điện nước và mở khóa tại nhà.',
      yearsOfExperience: 5,
      verificationStatus: 'VERIFIED',
      skills: [catDN, catSK],
      serviceAreas: ['Ngũ Hành Sơn', 'Sơn Trà', 'Hải Châu'],
      city: 'Đà Nẵng',
      location: { type: 'Point', coordinates: [108.2510, 16.0125] }, // Ngũ Hành Sơn
      averageRating: 4.8,
      reviewCount: 15,
      completedJobCount: 22,
      verifiedBy: staffId,
      verifiedAt: new Date(Date.now() - 20 * 86400000),
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Kiểm tra thông tin', adminId: staffId },
        { action: 'APPROVE', status: 'VERIFIED', note: 'Hồ sơ đạt tiêu chuẩn', adminId: staffId },
      ],
    },
    // 5. quoctest@gmail.com - Verified Handyman
    {
      email: 'quoctest@gmail.com',
      businessName: 'Dịch Vụ Kỹ Thuật Quốc Test',
      bio: 'Dịch vụ bảo dưỡng máy lạnh, sơn dặm tường nứt tại Cẩm Lệ và Hải Châu.',
      yearsOfExperience: 3,
      verificationStatus: 'VERIFIED',
      skills: [catDL, catSS],
      serviceAreas: ['Cẩm Lệ', 'Hải Châu', 'Thanh Khê'],
      city: 'Đà Nẵng',
      location: { type: 'Point', coordinates: [108.1965, 16.0180] }, // Cẩm Lệ
      averageRating: 4.6,
      reviewCount: 10,
      completedJobCount: 14,
      verifiedBy: staffId,
      verifiedAt: new Date(Date.now() - 15 * 86400000),
    },
    // 6. nashona315@gmail.com - Verified Appliance tech
    {
      email: 'nashona315@gmail.com',
      businessName: 'Sửa Điện Gia Dụng Nashona',
      bio: 'Sửa máy giặt, lò vi sóng, bếp điện tại Liên Chiểu và Thanh Khê.',
      yearsOfExperience: 4,
      verificationStatus: 'VERIFIED',
      skills: [catDGD, catDN],
      serviceAreas: ['Liên Chiểu', 'Thanh Khê', 'Cẩm Lệ'],
      city: 'Đà Nẵng',
      location: { type: 'Point', coordinates: [108.1492, 16.0754] }, // Liên Chiểu
      averageRating: 4.7,
      reviewCount: 8,
      completedJobCount: 12,
      verifiedBy: staffId,
      verifiedAt: new Date(Date.now() - 10 * 86400000),
    },
    // 7. provider.pending - PENDING verification for Staff testing (F2)
    {
      email: 'provider.pending@homecare.local',
      businessName: 'Thợ Khóa Kiến Hùng Đà Nẵng',
      bio: 'Thợ sửa khóa tận nhà, mở khóa an toàn không hư ổ khóa tại khu vực Hải Châu, Thanh Khê.',
      yearsOfExperience: 3,
      verificationStatus: 'PENDING',
      skills: [catSK],
      serviceAreas: ['Hải Châu', 'Thanh Khê'],
      city: 'Đà Nẵng',
      location: { type: 'Point', coordinates: [108.2150, 16.0650] },
      documents: [
        { docType: 'ID_CARD', filename: 'cccd_front.png' },
        { docType: 'ID_CARD', filename: 'cccd_back.png' },
        { docType: 'CERTIFICATE', filename: 'chung_chi_khoa.png' },
      ],
      verificationLogs: [
        { action: 'START_REVIEW', status: 'PENDING', note: 'Hồ sơ mới gửi, đang chờ nhân viên kiểm duyệt', adminId: staffId },
      ],
    },
    // 8. provider.review - UNDER_REVIEW for Staff testing (F2)
    {
      email: 'provider.review@homecare.local',
      businessName: 'Sơn Sửa Nhà Tuấn Kiệt Đà Nẵng',
      bio: 'Thợ chuyên sơn tường, chống thấm trần thạch cao tại Thanh Khê và Hải Châu.',
      yearsOfExperience: 7,
      verificationStatus: 'UNDER_REVIEW',
      skills: [catSS],
      serviceAreas: ['Thanh Khê', 'Hải Châu'],
      city: 'Đà Nẵng',
      location: { type: 'Point', coordinates: [108.1920, 16.0640] },
      documents: [
        { docType: 'ID_CARD', filename: 'cccd_front.png' },
        { docType: 'ID_CARD', filename: 'cccd_back.png' },
      ],
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Đang đối chiếu thông tin chứng chỉ nghề sơn bả', adminId: staffId },
      ],
    },
    // 9. provider.rejected - REJECTED for Staff testing
    {
      email: 'provider.rejected@homecare.local',
      businessName: 'Sửa Chữa Đồ Gia Dụng Văn Sơn',
      bio: 'Sửa máy giặt, lò vi sóng các loại tại Liên Chiểu.',
      yearsOfExperience: 2,
      verificationStatus: 'REJECTED',
      skills: [catDGD],
      serviceAreas: ['Liên Chiểu'],
      city: 'Đà Nẵng',
      location: { type: 'Point', coordinates: [108.1500, 16.0700] },
      verificationLogs: [
        { action: 'START_REVIEW', status: 'UNDER_REVIEW', note: 'Kiểm tra giấy tờ CCCD', adminId: staffId },
        { action: 'REJECT', status: 'REJECTED', note: 'Hình ảnh CCCD bị mờ, không rõ số căn cước và ngày cấp. Vui lòng chụp lại rõ nét.', adminId: staffId },
      ],
    },
  ];

  for (const prof of providerProfilesData) {
    const user = userMap[prof.email];
    if (user) {
      await ProviderProfile.create({
        user: user._id,
        fullName: user.fullName,
        userStatus: user.status || 'ACTIVE',
        businessName: prof.businessName,
        bio: prof.bio,
        yearsOfExperience: prof.yearsOfExperience,
        verificationStatus: prof.verificationStatus,
        skills: prof.skills,
        serviceCategories: prof.skills,
        serviceAreas: prof.serviceAreas,
        city: prof.city,
        location: prof.location,
        averageRating: prof.averageRating || 0,
        reviewCount: prof.reviewCount || 0,
        completedJobCount: prof.completedJobCount || 0,
        verifiedBy: prof.verifiedBy,
        verifiedAt: prof.verifiedAt,
        verificationLogs: prof.verificationLogs || [],
        payoutInfo: prof.payoutInfo,
        documents: (prof.documents || [
          { docType: 'ID_CARD', filename: 'cccd_front.png' },
          { docType: 'CERTIFICATE', filename: 'chung_chi_nghe.png' },
        ]).map((d) => {
          const fileUrl = `https://res.cloudinary.com/demo/image/upload/v1700000000/home-service-booking/provider-documents/${u._id}/${d.filename}`;
          if (!isOwnedProviderDocument(fileUrl, u._id)) {
            throw new Error(`[seed] Invalid document URL for provider ${u._id}: ${fileUrl}`);
          }
          return {
            docType: d.docType,
            fileUrl,
            uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          };
        }),
        isDeleted: false,
      });
    }
  }
  console.log(`   Seeded ${providerProfilesData.length} provider profiles in Da Nang.`);

  // =========================================================================
  // STEP 6: SEED PROVIDER AVAILABILITY SCHEDULES
  // =========================================================================
  console.log('6. Seeding Provider Availability Schedules...');
  const weeklyTemplate = Availability.getDefaultWeeklySchedule ? Availability.getDefaultWeeklySchedule() : [
    { dayOfWeek: 1, dayName: 'monday', isOff: false, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 2, dayName: 'tuesday', isOff: false, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 3, dayName: 'wednesday', isOff: false, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 4, dayName: 'thursday', isOff: false, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 5, dayName: 'friday', isOff: false, startTime: '08:00', endTime: '18:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 6, dayName: 'saturday', isOff: false, startTime: '08:00', endTime: '17:00', breaks: [{ startTime: '12:00', endTime: '13:00', note: 'Nghỉ trưa' }] },
    { dayOfWeek: 0, dayName: 'sunday', isOff: true, startTime: '08:00', endTime: '12:00', breaks: [] },
  ];

  const activeProviderEmails = [
    'provider.demo@homecare.local',
    'provider2.demo@homecare.local',
    'provider3.demo@homecare.local',
    'nam@gmail.com',
    'quoctest@gmail.com',
    'nashona315@gmail.com',
  ];

  for (const email of activeProviderEmails) {
    const pUser = userMap[email];
    if (pUser) {
      await Availability.create({
        provider: pUser._id,
        weeklySchedule: weeklyTemplate,
        daysOff: [],
        settings: {
          slotDurationMinutes: 60,
          travelBufferMinutes: 30,
          isAcceptingBookings: true,
        },
      });
    }
  }
  console.log(`   Seeded availability schedules for ${activeProviderEmails.length} active providers.`);

  // =========================================================================
  // STEP 7: SEED MEMBERSHIP PLANS, SUBSCRIPTIONS & PAYMENTS
  // =========================================================================
  console.log('7. Seeding Membership Plans & Subscriptions...');
  const plansData = [
    {
      name: 'Gói Cơ Bản (Standard)',
      slug: 'standard',
      monthlyPrice: 199000,
      benefits: ['Nhận không giới hạn yêu cầu tại Đà Nẵng', 'Huy hiệu thợ tiêu chuẩn', 'Hỗ trợ kỹ thuật qua chat'],
      isActive: true,
      version: 1,
    },
    {
      name: 'Gói Chuyên Nghiệp (Pro)',
      slug: 'pro',
      monthlyPrice: 499000,
      benefits: ['Ưu tiên hiển thị top 3 gợi ý tại Đà Nẵng', 'Huy hiệu thợ Pro uy tín', 'Không tính hoa hồng đơn hàng', 'Báo cáo doanh thu chi tiết'],
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
    const created = await MembershipPlan.create(pl);
    planMap[pl.slug] = created;
  }

  // Active Pro subscription for provider.demo
  const provDemoUser = userMap['provider.demo@homecare.local'];
  const proPlan = planMap['pro'];
  if (provDemoUser && proPlan) {
    const sub = await ProviderSubscription.create({
      provider: provDemoUser._id,
      plan: proPlan._id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(Date.now() - 15 * 86400000),
      currentPeriodEnd: new Date(Date.now() + 15 * 86400000),
    });

    await MembershipPayment.create({
      provider: provDemoUser._id,
      subscription: sub._id,
      plan: proPlan._id,
      planVersion: 1,
      planNameSnapshot: proPlan.name,
      amount: proPlan.monthlyPrice,
      currency: 'VND',
      orderCode: 2026110301,
      status: 'PAID',
      paidAt: new Date(Date.now() - 15 * 86400000),
      expiresAt: new Date(Date.now() + 15 * 86400000),
      appliedAt: new Date(Date.now() - 15 * 86400000),
    });
  }

  // =========================================================================
  // STEP 8: SEED SERVICE REQUESTS (ALL IN DA NANG)
  // =========================================================================
  console.log('8. Seeding Service Requests in Da Nang...');
  const c1 = userMap['customer.demo@homecare.local']._id;
  const c2 = userMap['customer2.demo@homecare.local']._id;
  const c3 = userMap['customer3.demo@homecare.local']._id;
  const cQuoc = userMap['quoc@gmail.com'] ? userMap['quoc@gmail.com']._id : c1;
  const cPhong = userMap['phongndde170408@fpt.edu.vn'] ? userMap['phongndde170408@fpt.edu.vn']._id : c2;

  const now = Date.now();
  const day = 86400000;

  const requestsData = [
    // Req 1: OPEN - Hải Châu, Đà Nẵng (For Staff Assign / Provider Matching)
    {
      _id: ID.req(1),
      customer: c1,
      service: serviceMap['sua-ong-nuoc-ro-ri']._id,
      category: categoryMap['dien-nuoc']._id,
      description: 'Vòi sen tắm và đường ống cấp nước nóng bị rò rỉ tại tầng 2, nước chảy lênh láng. Cần thợ xử lý trong ngày.',
      address: {
        recipientName: 'Nguyễn Thị Thanh',
        phone: '0922222222',
        addressLine: '25 Quang Trung, Tầng 2',
        ward: 'Phường Thạch Thang',
        district: 'Hải Châu',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.2208, 16.0678] },
      },
      preferredStartAt: new Date(now + 1 * day + 2 * 3600000),
      preferredEndAt: new Date(now + 1 * day + 4 * 3600000),
      budgetMin: 150000,
      budgetMax: 350000,
      status: 'OPEN',
    },

    // Req 2: OPEN - Sơn Trà, Đà Nẵng (For Staff Assign / Provider Matching)
    {
      _id: ID.req(2),
      customer: c2,
      service: serviceMap['ve-sinh-may-lanh']._id,
      category: categoryMap['dien-lanh']._id,
      description: '2 máy lạnh Daikin Inverter tại phòng khách và phòng ngủ cần vệ sinh xịt rửa định kỳ trước mùa hè.',
      address: {
        recipientName: 'Trần Minh Khoa',
        phone: '0944444444',
        addressLine: '68 Hoàng Hoa Thám',
        ward: 'Phường Tân Chính',
        district: 'Thanh Khê',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.1884, 16.0620] },
      },
      preferredStartAt: new Date(now + 1 * day + 3 * 3600000),
      preferredEndAt: new Date(now + 1 * day + 5 * 3600000),
      budgetMin: 300000,
      budgetMax: 500000,
      status: 'OPEN',
    },

    // Req 3: OPEN - Sơn Trà with AI Analysis
    {
      _id: ID.req(3),
      customer: c3,
      service: serviceMap['mo-khoa-tai-nha']._id,
      category: categoryMap['sua-khoa']._id,
      description: 'Khóa cửa phòng ngủ tay gạt bị kẹt then lưỡi gà bên trong, chìa khóa không xoay được. Cần thợ hỗ trợ gấp.',
      address: {
        recipientName: 'Lê Hoàng Nam',
        phone: '0945555555',
        addressLine: '12 Phạm Văn Đồng',
        ward: 'Phường An Hải Bắc',
        district: 'Sơn Trà',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.2415, 16.0712] },
      },
      preferredStartAt: new Date(now + 2 * 3600000),
      preferredEndAt: new Date(now + 4 * 3600000),
      budgetMin: 150000,
      budgetMax: 300000,
      status: 'OPEN',
      aiAnalysis: {
        summary: 'Kẹt chốt khóa lưỡi gà cửa tay gạt phòng ngủ',
        suspectedIssue: 'Gãy lò xo hồi vị hoặc kẹt bi trong ruột khóa',
        urgency: 'HIGH',
        estimatedPriceMin: 150000,
        estimatedPriceMax: 250000,
        suggestedTools: ['Bộ mở khóa chuyên dụng', 'Kìm mỏ nhọn', 'Bình xịt bôi trơn RP7'],
        recommendations: ['Không tự ý dùng búa đập mạnh làm biến dạng khung nhôm kính'],
        confidence: 0.94,
        analyzedAt: new Date(),
      },
    },

    // Req 4: BOOKED -> Booking 1 (PENDING_CONFIRMATION) - Demonstrates F9 Accept/Decline
    {
      _id: ID.req(4),
      customer: c1,
      service: serviceMap['sua-dien-dan-dung']._id,
      category: categoryMap['dien-nuoc']._id,
      description: 'Ổ cắm điện phòng khách bị chập cháy khét, aptomat nhảy liên tục khi cắm thiết bị.',
      address: {
        recipientName: 'Nguyễn Thị Thanh',
        phone: '0922222222',
        addressLine: '45 Nguyễn Du',
        ward: 'Phường Thạch Thang',
        district: 'Hải Châu',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.2215, 16.0690] },
      },
      preferredStartAt: new Date(now + 1 * day + 1 * 3600000),
      preferredEndAt: new Date(now + 1 * day + 3 * 3600000),
      budgetMin: 150000,
      budgetMax: 350000,
      status: 'BOOKED',
    },

    // Req 5: BOOKED -> Booking 2 (CONFIRMED) - Demonstrates F6 Reschedule/Cancel
    {
      _id: ID.req(5),
      customer: c2,
      service: serviceMap['sua-ong-nuoc-ro-ri']._id,
      category: categoryMap['dien-nuoc']._id,
      description: 'Đường ống thoát nước lavabo nhà tắm bị nghẹt và rỉ nước ra sàn.',
      address: {
        recipientName: 'Trần Minh Khoa',
        phone: '0944444444',
        addressLine: '105 Nguyễn Văn Linh',
        ward: 'Phường Nam Dương',
        district: 'Hải Châu',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.2180, 16.0590] },
      },
      preferredStartAt: new Date(now + 2 * day + 2 * 3600000),
      preferredEndAt: new Date(now + 2 * day + 4 * 3600000),
      budgetMin: 200000,
      budgetMax: 400000,
      status: 'BOOKED',
    },

    // Req 6: BOOKED -> Booking 3 (IN_PROGRESS) - Demonstrates F3 Status/Materials
    {
      _id: ID.req(6),
      customer: c3,
      service: serviceMap['ve-sinh-may-lanh']._id,
      category: categoryMap['dien-lanh']._id,
      description: 'Máy lạnh Panasonic 1.5 HP tại phòng ngủ thổi gió yếu và có mùi ẩm mốc, cần vệ sinh xịt rửa.',
      address: {
        recipientName: 'Lê Hoàng Nam',
        phone: '0945555555',
        addressLine: '88 Võ Nguyên Giáp',
        ward: 'Phường Phước Mỹ',
        district: 'Sơn Trà',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.2425, 16.0612] },
      },
      preferredStartAt: new Date(now - 1 * 3600000),
      preferredEndAt: new Date(now + 2 * 3600000),
      budgetMin: 150000,
      budgetMax: 400000,
      status: 'BOOKED',
    },

    // Req 7: BOOKED -> Booking 4 (COMPLETED, PAID) - Demonstrates F12 Review
    {
      _id: ID.req(7),
      customer: c1,
      service: serviceMap['sua-dien-dan-dung']._id,
      category: categoryMap['dien-nuoc']._id,
      description: 'Bếp từ đang nấu thì aptomat tổng nhảy liên tục, nghi chập đường dây âm tường khu vực bếp.',
      address: {
        recipientName: 'Nguyễn Thị Thanh',
        phone: '0922222222',
        addressLine: '25 Quang Trung, Tầng 1',
        ward: 'Phường Thạch Thang',
        district: 'Hải Châu',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.2208, 16.0678] },
      },
      preferredStartAt: new Date(now - 3 * day),
      preferredEndAt: new Date(now - 3 * day + 2 * 3600000),
      budgetMin: 200000,
      budgetMax: 500000,
      status: 'BOOKED',
    },

    // Req 8: BOOKED -> Booking 5 (COMPLETED, PAID) - Demonstrates F5/F11 Open Complaint
    {
      _id: ID.req(8),
      customer: c2,
      service: serviceMap['don-dep-nha-theo-gio']._id,
      category: categoryMap['don-dep-nha']._id,
      description: 'Cần dọn dẹp nhà 2 tầng trước khi đón khách: lau kính, quét mạng nhện, cọ rửa 2 nhà vệ sinh.',
      address: {
        recipientName: 'Trần Minh Khoa',
        phone: '0944444444',
        addressLine: '68 Hoàng Hoa Thám',
        ward: 'Phường Tân Chính',
        district: 'Thanh Khê',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.1884, 16.0620] },
      },
      preferredStartAt: new Date(now - 2 * day),
      preferredEndAt: new Date(now - 2 * day + 3 * 3600000),
      budgetMin: 250000,
      budgetMax: 500000,
      status: 'BOOKED',
    },

    // Req 9: BOOKED -> Booking 6 (COMPLETED, PAID) - Demonstrates Resolved Complaint
    {
      _id: ID.req(9),
      customer: c3,
      service: serviceMap['sua-may-lanh']._id,
      category: categoryMap['dien-lanh']._id,
      description: 'Máy lạnh phòng khách kêu rè rè và nhỏ nước xuống sàn gỗ.',
      address: {
        recipientName: 'Lê Hoàng Nam',
        phone: '0945555555',
        addressLine: '12 Phạm Văn Đồng',
        ward: 'Phường An Hải Bắc',
        district: 'Sơn Trà',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.2415, 16.0712] },
      },
      preferredStartAt: new Date(now - 5 * day),
      preferredEndAt: new Date(now - 5 * day + 2 * 3600000),
      budgetMin: 200000,
      budgetMax: 600000,
      status: 'BOOKED',
    },

    // Req 10: BOOKED -> Booking 7 (COMPLETED, PAID) - Customer quoc@gmail.com unreviewed
    {
      _id: ID.req(10),
      customer: cQuoc,
      service: serviceMap['sua-ong-nuoc-ro-ri']._id,
      category: categoryMap['dien-nuoc']._id,
      description: 'Thay vòi nước bồn rửa chén và van khóa tổng cho nhà ở đường Trần Hưng Đạo.',
      address: {
        recipientName: 'Quốc',
        phone: '0933333333',
        addressLine: '29 Trần Hưng Đạo',
        ward: 'Phường An Hải Tây',
        district: 'Sơn Trà',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.2345, 16.0625] },
      },
      preferredStartAt: new Date(now - 1 * day),
      preferredEndAt: new Date(now - 1 * day + 2 * 3600000),
      budgetMin: 180000,
      budgetMax: 350000,
      status: 'BOOKED',
    },

    // Req 11: CANCELLED
    {
      _id: ID.req(11),
      customer: cPhong,
      service: serviceMap['son-tuong-noi-that']._id,
      category: categoryMap['son-sua-nha']._id,
      description: 'Sơn lại mảng tường phòng khách bị nứt chân chim tại Khu đô thị FPT.',
      address: {
        recipientName: 'Phong SE17D06',
        phone: '0988888888',
        addressLine: 'Khu đô thị FPT City, Tòa Plaza',
        ward: 'Phường Hòa Hải',
        district: 'Ngũ Hành Sơn',
        city: 'Đà Nẵng',
        location: { type: 'Point', coordinates: [108.2612, 16.0015] },
      },
      preferredStartAt: new Date(now - 6 * day),
      preferredEndAt: new Date(now - 6 * day + 4 * 3600000),
      budgetMin: 500000,
      budgetMax: 1000000,
      status: 'CANCELLED',
      cancellationReason: 'Khách hàng dời lịch công tác sang tuần sau',
      cancelledBy: cPhong,
      cancelledAt: new Date(now - 6 * day + 1800000),
    },
  ];

  for (const r of requestsData) {
    await ServiceRequest.create(r);
  }
  console.log(`   Seeded ${requestsData.length} service requests in Da Nang.`);

  // =========================================================================
  // STEP 9: SEED BOOKINGS (ALL IN DA NANG)
  // =========================================================================
  console.log('9. Seeding Bookings in Da Nang...');
  const p1 = userMap['provider.demo@homecare.local']._id;
  const p2 = userMap['provider2.demo@homecare.local']._id;
  const p3 = userMap['provider3.demo@homecare.local']._id;
  const pNam = userMap['nam@gmail.com'] ? userMap['nam@gmail.com']._id : p1;

  const bookingsData = [
    // Booking 1: PENDING_CONFIRMATION (Req 4) - Provider Demo Phát Đạt needs to Accept or Decline (F9)
    {
      _id: ID.booking(1),
      request: ID.req(4),
      customer: c1,
      provider: p1,
      service: serviceMap['sua-dien-dan-dung']._id,
      scheduledStartAt: new Date(now + 1 * day + 1 * 3600000),
      scheduledEndAt: new Date(now + 1 * day + 3 * 3600000),
      address: requestsData[3].address,
      price: 200000,
      status: 'PENDING_CONFIRMATION',
      paymentStatus: 'UNPAID',
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'PENDING_CONFIRMATION', changedBy: c1, note: 'Khách hàng gửi yêu cầu đặt lịch hẹn mới tại Đà Nẵng' },
      ],
    },

    // Booking 2: CONFIRMED (Req 5) - Provider Demo Phát Đạt accepted, ready for Reschedule/Cancel (F6)
    {
      _id: ID.booking(2),
      request: ID.req(5),
      customer: c2,
      provider: p1,
      service: serviceMap['sua-ong-nuoc-ro-ri']._id,
      scheduledStartAt: new Date(now + 2 * day + 2 * 3600000),
      scheduledEndAt: new Date(now + 2 * day + 4 * 3600000),
      address: requestsData[4].address,
      price: 250000,
      status: 'CONFIRMED',
      paymentStatus: 'UNPAID',
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: p1, note: 'Thợ Phát Đạt đã tiếp nhận đơn và xác nhận giờ hẹn' },
      ],
    },

    // Booking 3: IN_PROGRESS (Req 6) - Provider Minh Thông working
    {
      _id: ID.booking(3),
      request: ID.req(6),
      customer: c3,
      provider: p2,
      service: serviceMap['ve-sinh-may-lanh']._id,
      scheduledStartAt: new Date(now - 1 * 3600000),
      scheduledEndAt: new Date(now + 2 * 3600000),
      address: requestsData[5].address,
      price: 150000,
      status: 'IN_PROGRESS',
      paymentStatus: 'PENDING',
      startedAt: new Date(now - 45 * 60000),
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: p2, note: 'Thợ Minh Thông nhận lịch' },
        { from: 'CONFIRMED', to: 'PROVIDER_ON_THE_WAY', changedBy: p2, note: 'Thợ đang di chuyển trên cầu Rồng tới Sơn Trà' },
        { from: 'PROVIDER_ON_THE_WAY', to: 'ARRIVED', changedBy: p2, note: 'Thợ đã có mặt tại nhà khách' },
        { from: 'ARRIVED', to: 'IN_PROGRESS', changedBy: p2, note: 'Bắt đầu tháo lồng xịt rửa dàn lạnh' },
      ],
    },

    // Booking 4: COMPLETED & PAID (Req 7) - Has 5-star Review (F12)
    {
      _id: ID.booking(4),
      request: ID.req(7),
      customer: c1,
      provider: p1,
      service: serviceMap['sua-dien-dan-dung']._id,
      scheduledStartAt: new Date(now - 3 * day),
      scheduledEndAt: new Date(now - 3 * day + 2 * 3600000),
      address: requestsData[6].address,
      price: 350000,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt: new Date(now - 3 * day + 1.8 * 3600000),
      completionNote: 'Đã xử lý điểm chập điện ở hộp nối âm tường, thay aptomat chống giật Panasonic 32A.',
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: p1, note: 'Xác nhận đơn' },
        { from: 'CONFIRMED', to: 'IN_PROGRESS', changedBy: p1, note: 'Tiến hành đo đạc điện áp' },
        { from: 'IN_PROGRESS', to: 'COMPLETED', changedBy: p1, note: 'Khắc phục hoàn tất sự cố an toàn' },
      ],
    },

    // Booking 5: COMPLETED & PAID (Req 8) - Has OPEN Complaint for Staff Arbitration (F5, F11)
    {
      _id: ID.booking(5),
      request: ID.req(8),
      customer: c2,
      provider: p3,
      service: serviceMap['don-dep-nha-theo-gio']._id,
      scheduledStartAt: new Date(now - 2 * day),
      scheduledEndAt: new Date(now - 2 * day + 3 * 3600000),
      address: requestsData[7].address,
      price: 300000,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt: new Date(now - 2 * day + 3.5 * 3600000),
      completionNote: 'Đã hoàn tất dọn dẹp nhà 2 tầng.',
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: p3, note: 'Nhận lịch dọn dẹp' },
        { from: 'CONFIRMED', to: 'IN_PROGRESS', changedBy: p3, note: 'Bắt đầu làm việc' },
        { from: 'IN_PROGRESS', to: 'COMPLETED', changedBy: p3, note: 'Hoàn thành công việc' },
      ],
    },

    // Booking 6: COMPLETED & PAID (Req 9) - Has RESOLVED Complaint
    {
      _id: ID.booking(6),
      request: ID.req(9),
      customer: c3,
      provider: p2,
      service: serviceMap['sua-may-lanh']._id,
      scheduledStartAt: new Date(now - 5 * day),
      scheduledEndAt: new Date(now - 5 * day + 2 * 3600000),
      address: requestsData[8].address,
      price: 280000,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt: new Date(now - 5 * day + 2.2 * 3600000),
      completionNote: 'Thông tắc đường ống thoát nước ngưng và bọc lại bảo ôn ống đồng.',
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: p2, note: 'Tiếp nhận đơn' },
        { from: 'CONFIRMED', to: 'IN_PROGRESS', changedBy: p2, note: 'Kiểm tra đường ống nước' },
        { from: 'IN_PROGRESS', to: 'COMPLETED', changedBy: p2, note: 'Hoàn thành sửa chữa' },
      ],
    },

    // Booking 7: COMPLETED & PAID (Req 10) - Unreviewed, ready for Customer quoc@gmail.com to test review (F12)
    {
      _id: ID.booking(7),
      request: ID.req(10),
      customer: cQuoc,
      provider: pNam,
      service: serviceMap['sua-ong-nuoc-ro-ri']._id,
      scheduledStartAt: new Date(now - 1 * day),
      scheduledEndAt: new Date(now - 1 * day + 2 * 3600000),
      address: requestsData[9].address,
      price: 220000,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt: new Date(now - 1 * day + 1.5 * 3600000),
      completionNote: 'Thay vòi nước inox 304 mới và quấn băng tan chống rỉ.',
      statusHistory: [
        { from: 'PENDING_CONFIRMATION', to: 'CONFIRMED', changedBy: pNam, note: 'Nhận đơn' },
        { from: 'CONFIRMED', to: 'IN_PROGRESS', changedBy: pNam, note: 'Bắt đầu thay vòi' },
        { from: 'IN_PROGRESS', to: 'COMPLETED', changedBy: pNam, note: 'Hoàn tất nghiệm thu' },
      ],
    },
  ];

  for (const b of bookingsData) {
    await Booking.create(b);
  }
  console.log(`   Seeded ${bookingsData.length} bookings in Da Nang.`);

  // =========================================================================
  // STEP 10: SEED REVIEWS & RATINGS (F12)
  // =========================================================================
  console.log('10. Seeding Reviews...');
  const reviewsData = [
    {
      _id: ID.review(1),
      booking: ID.booking(4),
      customer: c1,
      provider: p1,
      rating: 5,
      comment: 'Anh Đạt sửa điện rất tận tâm, giải thích nguyên nhân nhảy CB cặn kẽ và xử lý triệt để. Giá cả rất minh bạch, đúng hẹn tại Hải Châu!',
      response: 'Dạ cảm ơn chị Thanh đã tin tưởng dịch vụ Điện Nước Phát Đạt Đà Nẵng! Chúc gia đình chị luôn an toàn và nhiều sức khỏe ạ.',
      isVisible: true,
    },
  ];

  for (const rev of reviewsData) {
    await Review.create(rev);
  }
  console.log(`   Seeded ${reviewsData.length} reviews.`);

  // =========================================================================
  // STEP 11: SEED COMPLAINTS & ARBITRATION (F5, F11)
  // =========================================================================
  console.log('11. Seeding Complaints...');
  const complaintsData = [
    // Complaint 1: UNDER_REVIEW / OPEN - Ready for Staff Arbitration & Dialogue
    {
      _id: ID.complaint(1),
      booking: ID.booking(5),
      reporter: c2,
      against: p3,
      category: 'LATE_ARRIVAL',
      title: 'Thợ đến trễ 45 phút so với giờ hẹn dọn nhà',
      description: 'Tôi đã đặt lịch hẹn lúc 08:30 sáng tại Thanh Khê để kịp đón người nhà lúc 11:00. Tuy nhiên thợ đến trễ hơn 45 phút mà không gọi điện báo trước, làm xáo trộn kế hoạch của gia đình tôi.',
      status: 'UNDER_REVIEW',
      replies: [
        {
          sender: c2,
          senderRole: 'CUSTOMER',
          message: 'Tôi yêu cầu hệ thống CSKH nhắc nhở đối tác thợ và có biện pháp chấn chỉnh giờ giấc làm việc.',
          createdAt: new Date(now - 1.5 * day),
        },
        {
          sender: p3,
          senderRole: 'PROVIDER',
          message: 'Dạ em chào anh Khoa, sáng hôm đó đoạn đường Điện Biên Phủ bị ùn tắc do sự cố giao thông, máy em lại hết pin nên chưa kịp gọi anh sớm. Em thành thật xin lỗi anh Khoa ạ.',
          createdAt: new Date(now - 1 * day),
        },
        {
          sender: staffId,
          senderRole: 'STAFF',
          message: 'CSKH HomeCare Đà Nẵng đã tiếp nhận thông tin từ hai bên. Nhân viên sẽ tiến hành xác minh và đưa ra phương án xử lý thỏa đáng nhất trong 24h tới.',
          createdAt: new Date(now - 12 * 3600000),
        },
      ],
    },

    // Complaint 2: RESOLVED - Successfully resolved by Staff
    {
      _id: ID.complaint(2),
      booking: ID.booking(6),
      reporter: c3,
      against: p2,
      category: 'PRICE',
      title: 'Thắc mắc giá dịch vụ vệ sinh máy lạnh',
      description: 'Khách hàng cần được giải thích về giá dịch vụ đã niêm yết trước khi xác nhận booking.',
      status: 'RESOLVED',
      resolutionNote: 'Nhân viên CSKH đã đối chiếu giá dịch vụ đã xác nhận với booking và giải thích rõ cho khách hàng.',
      resolvedBy: staffId,
      resolvedAt: new Date(now - 4 * day),
    },
  ];

  for (const comp of complaintsData) {
    await Complaint.create(comp);
  }
  console.log(`   Seeded ${complaintsData.length} complaints.`);

  // =========================================================================
  // STEP 12: SEED NOTIFICATIONS
  // =========================================================================
  console.log('12. Seeding Notifications...');
  const notificationsData = [
    {
      recipient: c1,
      type: 'BOOKING_CREATED',
      title: 'Đơn đặt lịch mới đang chờ thợ xác nhận!',
      message: 'Yêu cầu sửa điện dân dụng của bạn tại Hải Châu, Đà Nẵng đã được gửi tới thợ Trần Phát Đạt.',
      resourceType: 'BOOKING',
      resourceId: ID.booking(1),
      readAt: new Date(),
    },
    {
      recipient: p1,
      type: 'BOOKING_CREATED',
      title: 'Bạn có đơn đặt lịch mới cần xác nhận!',
      message: 'Khách hàng Nguyễn Thị Thanh vừa đặt lịch hẹn sửa điện dân dụng tại 45 Nguyễn Du, Hải Châu.',
      resourceType: 'BOOKING',
      resourceId: ID.booking(1),
    },
    {
      recipient: p2,
      type: 'BOOKING_STATUS_UPDATED',
      title: 'Trạng thái đơn hàng cập nhật',
      message: 'Đơn sửa máy lạnh tại Sơn Trà đã hoàn tất thành công.',
      resourceType: 'BOOKING',
      resourceId: ID.booking(6),
    },
  ];

  for (const notif of notificationsData) {
    await Notification.create(notif);
  }
  console.log(`   Seeded ${notificationsData.length} notifications.`);

  // =========================================================================
  // STEP 13: SEED PAYMENTS FOR ADMIN REVENUE REPORTS
  // =========================================================================
  console.log('13. Seeding Payments for Financial Reports...');
  const paymentsData = [
    {
      booking: ID.booking(4),
      customer: c1,
      provider: p1,
      amount: 350000,
      method: 'VNPAY',
      status: 'PAID',
      transactionId: 'VNPAY_DN_20261101_001',
      paidAt: new Date(now - 3 * day),
      note: 'Thanh toán hoàn tất đơn sửa điện dân dụng',
    },
    {
      booking: ID.booking(5),
      customer: c2,
      provider: p3,
      amount: 300000,
      method: 'CASH',
      status: 'PAID',
      transactionId: 'CASH_DN_20261102_002',
      paidAt: new Date(now - 2 * day),
      note: 'Thanh toán tiền mặt đơn dọn dẹp nhà',
    },
    {
      booking: ID.booking(6),
      customer: c3,
      provider: p2,
      amount: 280000,
      method: 'BANK_TRANSFER',
      status: 'PAID',
      transactionId: 'BANK_DN_20261029_003',
      paidAt: new Date(now - 5 * day),
      note: 'Chuyển khoản thanh toán sửa máy lạnh',
    },
    {
      booking: ID.booking(7),
      customer: cQuoc,
      provider: pNam,
      amount: 220000,
      method: 'VNPAY',
      status: 'PAID',
      transactionId: 'VNPAY_DN_20261103_004',
      paidAt: new Date(now - 1 * day),
      note: 'Thanh toán thay vòi nước',
    },
  ];

  for (const pay of paymentsData) {
    await Payment.create(pay);
  }
  console.log(`   Seeded ${paymentsData.length} financial payments.`);

  console.log(`
=================================================================
DATABASE RESET & DA NANG SEEDING COMPLETED SUCCESSFULLY!
-----------------------------------------------------------------
Users preserved:        ${users.length} (all updated to Da Nang addresses)
Service Categories:     ${Object.keys(categoryMap).length} active categories
Services:               ${Object.keys(serviceMap).length} services
Provider Profiles:      ${providerProfilesData.length} profiles in Da Nang
Availability:           ${activeProviderEmails.length} active schedules
Membership Plans:       ${plansData.length} plans
Service Requests:       ${requestsData.length} requests in Da Nang
Bookings:               ${bookingsData.length} bookings in Da Nang
Reviews:                ${reviewsData.length} reviews
Complaints:             ${complaintsData.length} complaints (1 OPEN with dialogue, 1 RESOLVED)
Notifications:          ${notificationsData.length} system notifications
Payments:               ${paymentsData.length} financial revenue records
=================================================================
`);

  process.exit(0);
}

resetAndSeedDaNang().catch((err) => {
  console.error('Error during reset and seed:', err);
  process.exit(1);
});
