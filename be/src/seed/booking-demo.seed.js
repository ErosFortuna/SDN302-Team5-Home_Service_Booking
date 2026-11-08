/**
 * Demo data for UC-14 (Update Service Status), UC-15/16 (Extra Materials) and UC-09 (Availability).
 * Creates one PROVIDER, one CUSTOMER, ProviderProfile, ServiceRequest, Service, Availability schedule, and a CONFIRMED booking.
 *
 *   npm run seed:booking
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db.js');
const User = require('../modules/users/user.model.js');
const ServiceCategory = require('../modules/categories/service-category.model.js');
const Service = require('../modules/services/service.model.js');
const ServiceRequest = require('../modules/requests/request.model.js');
const ProviderProfile = require('../modules/providers/provider.model.js');
const Booking = require('../modules/bookings/booking.model.js');
const Availability = require('../modules/availability/availability.model.js');

const PASSWORD = process.env.SEED_PASSWORD;
// Fixed ids keep the script idempotent (re-running resets the demo booking).
const DEMO_REQUEST_ID = new mongoose.Types.ObjectId('66f000000000000000000001');
const DEMO_SERVICE_ID = new mongoose.Types.ObjectId('66f000000000000000000003');
const DEMO_CATEGORY_ID = new mongoose.Types.ObjectId('66f000000000000000000002');

async function upsertUser({ email, ...fields }, passwordHash) {
  await User.updateOne(
    { email },
    { $set: { email, passwordHash, status: 'ACTIVE', emailVerified: true, tokenVersion: 0, ...fields } },
    { upsert: true },
  );
  return User.findOne({ email });
}

async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
  if (!PASSWORD || Buffer.byteLength(PASSWORD, 'utf8') > 72 || [...PASSWORD].length < 10) {
    throw new Error('SEED_PASSWORD must be configured with 10 to 72 bytes of password material');
  }
  await connectDB();
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // 1. Users
  const provider = await upsertUser(
    { email: 'provider.demo@homecare.local', fullName: 'Thợ Demo Phát Đạt', phone: '0911111111', role: 'PROVIDER' },
    passwordHash,
  );
  const customer = await upsertUser(
    { email: 'customer.demo@homecare.local', fullName: 'Nguyễn Thị Thanh', phone: '0922222222', role: 'CUSTOMER' },
    passwordHash,
  );

  // 2. Ensure Category & Service exist for demo
  let category = await ServiceCategory.findOne({
    $or: [{ _id: DEMO_CATEGORY_ID }, { slug: 'dien-nuoc' }],
  });
  if (category) {
    await ServiceCategory.updateOne(
      { _id: category._id },
      {
        $set: {
          name: 'Điện nước',
          slug: 'dien-nuoc',
          icon: 'droplets',
          pricingMode: 'FIXED',
          description: 'Sửa chữa, lắp đặt hệ thống điện và đường ống nước dân dụng.',
          isActive: true,
          sortOrder: 1,
        },
      },
    );
  } else {
    category = await ServiceCategory.create({
      _id: DEMO_CATEGORY_ID,
      name: 'Điện nước',
      slug: 'dien-nuoc',
      icon: 'droplets',
      pricingMode: 'FIXED',
      description: 'Sửa chữa, lắp đặt hệ thống điện và đường ống nước dân dụng.',
      isActive: true,
      sortOrder: 1,
    });
  }

  let service = await Service.findOne({
    $or: [{ _id: DEMO_SERVICE_ID }, { slug: 'sua-ong-nuoc-ro-ri' }],
  });
  if (service) {
    await Service.updateOne(
      { _id: service._id },
      {
        $set: {
          category: category._id,
          name: 'Sửa ống nước rò rỉ',
          slug: 'sua-ong-nuoc-ro-ri',
          basePrice: 150000,
          estimatedDurationMinutes: 60,
          pricingType: 'FIXED',
          description: 'Khắc phục triệt để rò rỉ đường ống nước, van khóa, vòi rửa',
          isActive: true,
        },
      },
    );
  } else {
    service = await Service.create({
      _id: DEMO_SERVICE_ID,
      category: category._id,
      name: 'Sửa ống nước rò rỉ',
      slug: 'sua-ong-nuoc-ro-ri',
      basePrice: 150000,
      estimatedDurationMinutes: 60,
      pricingType: 'FIXED',
      description: 'Khắc phục triệt để rò rỉ đường ống nước, van khóa, vòi rửa',
      isActive: true,
    });
  }

  // 3. ProviderProfile (VERIFIED)
  await ProviderProfile.updateOne(
    { user: provider._id },
    {
      $set: {
        user: provider._id,
        fullName: provider.fullName,
        userStatus: provider.status || 'ACTIVE',
        businessName: 'Điện Nước Phát Đạt',
        bio: 'Thợ lành nghề với hơn 6 năm kinh nghiệm sửa chữa điện nước, điện lạnh dân dụng tại TP.HCM.',
        yearsOfExperience: 6,
        verificationStatus: 'VERIFIED',
        skills: [category._id],
        serviceAreas: ['Quận 1', 'Quận 3', 'Bình Thạnh'],
        city: 'TP.HCM',
        averageRating: 4.8,
        reviewCount: 42,
        completedJobCount: 56,
        location: { type: 'Point', coordinates: [106.7009, 10.7769] },
        isDeleted: false,
      },
    },
    { upsert: true },
  );

  // 4. ServiceRequest
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  await ServiceRequest.findOneAndUpdate(
    { _id: DEMO_REQUEST_ID },
    {
      $set: {
        _id: DEMO_REQUEST_ID,
        customer: customer._id,
        service: service._id,
        category: category._id,
        description: 'Ống thoát nước dưới bồn rửa chén bị rò rỉ liên tục, nước đọng đầy tủ bếp. Đã khóa van tạm thời nhưng vẫn nhỏ giọt.',
        address: {
          recipientName: 'Nguyễn Thị Thanh',
          phone: '0922222222',
          addressLine: '45 Nguyễn Huệ, Tầng 12 căn 12.05',
          ward: 'Bến Nghé',
          district: 'Quận 1',
          city: 'TP.HCM',
          location: { type: 'Point', coordinates: [106.7032, 10.7745] },
        },
        preferredStartAt: start,
        preferredEndAt: end,
        budgetMin: 150000,
        budgetMax: 400000,
        status: 'BOOKED',
        attachments: [],
      },
    },
    { upsert: true },
  );

  // 5. Booking
  await Booking.deleteOne({ request: DEMO_REQUEST_ID });

  const booking = await Booking.create({
    request: DEMO_REQUEST_ID,
    service: service._id,
    customer: customer._id,
    provider: provider._id,
    scheduledStartAt: start,
    scheduledEndAt: end,
    address: {
      recipientName: 'Nguyễn Thị Thanh',
      phone: '0922222222',
      addressLine: '45 Nguyễn Huệ',
      ward: 'Bến Nghé',
      district: 'Quận 1',
      city: 'TP.HCM',
    },
    price: 450000,
    status: 'CONFIRMED',
    paymentStatus: 'UNPAID',
    statusHistory: [
      {
        from: 'PENDING_CONFIRMATION',
        to: 'CONFIRMED',
        changedBy: provider._id,
        note: 'Thợ đã tiếp nhận và xác nhận đơn hàng demo',
        changedAt: new Date(),
      },
    ],
  });

  // 6. UC-09: Seed availability for provider
  await Availability.findOneAndUpdate(
    { provider: provider._id },
    {
      $set: {
        provider: provider._id,
        weeklySchedule: Availability.getDefaultWeeklySchedule ? Availability.getDefaultWeeklySchedule() : [],
        daysOff: [
          {
            date: '2026-11-20',
            isFullDayOff: true,
            reason: 'Bảo dưỡng trang thiết bị định kỳ',
          },
        ],
        settings: {
          slotDurationMinutes: 60,
          travelBufferMinutes: 30,
          isAcceptingBookings: true,
        },
      },
    },
    { upsert: true }
  );

  console.log(`
Demo seed completed. Configure SEED_PASSWORD for these demo accounts.
  Provider     : ${provider.email} (VERIFIED)
  Customer     : ${customer.email}
  Service      : ${service.name} (${service.slug})
  Request      : ${DEMO_REQUEST_ID} (status BOOKED)
  Booking      : ${booking._id} (status CONFIRMED)
  Availability : Seeded successfully for provider
`);
  process.exit(0);
}

seed().catch((error) => {
  console.error('Booking demo seed error:', error);
  process.exit(1);
});
