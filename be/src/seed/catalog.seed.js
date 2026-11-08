/**
 * Demo data + migration for UC-57/58 (Admin categories & services) and UC-33 (Provider skills).
 *
 *   npm run seed:catalog
 *
 * - Migrates ProviderProfile.serviceCategories → skills and legacy APPROVED → VERIFIED
 * - Back-fills pricingMode / icon on legacy categories
 * - Upserts a demo catalogue (7 active + 1 inactive category)
 * - Upserts demo services for each active category
 * - Creates admin.demo@homecare.local (ADMIN) and staff.demo@homecare.local (STAFF)
 *
 * Password for demo accounts: Demo123!
 */
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db.js');
const User = require('../modules/users/user.model.js');
const ServiceCategory = require('../modules/categories/service-category.model.js');
const Service = require('../modules/services/service.model.js');
const ProviderProfile = require('../modules/providers/provider.model.js');

const PASSWORD = 'Demo123!';

const CATALOG = [
  { slug: 'dien-nuoc', name: 'Điện nước', icon: 'droplets', pricingMode: 'FIXED', sortOrder: 1, description: 'Sửa chữa, lắp đặt hệ thống điện và đường ống nước dân dụng.' },
  { slug: 'dien-lanh', name: 'Điện lạnh', icon: 'snowflake', pricingMode: 'FIXED', sortOrder: 2, description: 'Sửa chữa, bảo dưỡng máy lạnh, tủ lạnh, máy nước nóng.' },
  { slug: 'don-dep-nha', name: 'Dọn dẹp nhà', icon: 'sparkles', pricingMode: 'FIXED', sortOrder: 3, description: 'Dọn dẹp theo giờ, tổng vệ sinh định kỳ hoặc sau chuyển nhà.' },
  { slug: 'sua-khoa', name: 'Sửa khóa', icon: 'key', pricingMode: 'FIXED', sortOrder: 4, description: 'Mở khóa, thay ổ khóa, lắp khóa điện tử.' },
  { slug: 'son-sua-nha', name: 'Sơn sửa nhà', icon: 'paintbrush', pricingMode: 'FIXED', sortOrder: 5, description: 'Sơn tường, chống thấm, sửa chữa nhỏ trong nhà.' },
  { slug: 'do-gia-dung', name: 'Sửa đồ gia dụng', icon: 'washing-machine', pricingMode: 'FIXED', sortOrder: 6, description: 'Máy giặt, lò vi sóng, bếp từ và thiết bị gia dụng khác.' },
  { slug: 'diet-con-trung', name: 'Diệt côn trùng', icon: 'bug', pricingMode: 'FIXED', sortOrder: 7, description: 'Phun thuốc diệt muỗi, gián, mối theo gói cố định.' },
  { slug: 'chuyen-nha', name: 'Chuyển nhà trọn gói', icon: 'truck', pricingMode: 'FIXED', sortOrder: 8, isActive: false, description: 'Đóng gói, vận chuyển đồ đạc (tạm ngừng cung cấp).' },
];

const SERVICES = [
  {
    categorySlug: 'dien-nuoc',
    slug: 'sua-ong-nuoc-ro-ri',
    name: 'Sửa ống nước rò rỉ',
    basePrice: 150000,
    estimatedDurationMinutes: 60,
    pricingType: 'FIXED',
    description: 'Khắc phục rò rỉ đường ống nước, van khóa, vòi sen, vòi lavabo.',
  },
  {
    categorySlug: 'dien-nuoc',
    slug: 'sua-dien-dan-dung',
    name: 'Sửa điện dân dụng',
    basePrice: 120000,
    estimatedDurationMinutes: 60,
    pricingType: 'FROM',
    description: 'Xử lý sự cố chập điện, nhảy aptomat, thay mới ổ cắm và công tắc.',
  },
  {
    categorySlug: 'dien-lanh',
    slug: 've-sinh-may-lanh',
    name: 'Vệ sinh máy lạnh',
    basePrice: 150000,
    estimatedDurationMinutes: 60,
    pricingType: 'FIXED',
    description: 'Vệ sinh lưới lọc, xịt rửa dàn nóng, dàn lạnh, kiểm tra gas.',
  },
  {
    categorySlug: 'dien-lanh',
    slug: 'sua-may-lanh',
    name: 'Sửa máy lạnh',
    basePrice: 200000,
    estimatedDurationMinutes: 90,
    pricingType: 'FROM',
    description: 'Kiểm tra máy lạnh không lạnh, chảy nước trong phòng, kêu to.',
  },
  {
    categorySlug: 'don-dep-nha',
    slug: 'don-dep-nha-theo-gio',
    name: 'Dọn dẹp nhà theo giờ',
    basePrice: 90000,
    estimatedDurationMinutes: 120,
    pricingType: 'FIXED',
    description: 'Lau dọn nhà cửa, dọn phòng khách, phòng ngủ, nhà vệ sinh theo giờ.',
  },
  {
    categorySlug: 'sua-khoa',
    slug: 'mo-khoa-tai-nha',
    name: 'Mở khóa tại nhà',
    basePrice: 150000,
    estimatedDurationMinutes: 45,
    pricingType: 'FROM',
    description: 'Xử lý kẹt khóa, mất chìa khóa cửa phòng, khóa cổng, khóa tay gạt.',
  },
  {
    categorySlug: 'son-sua-nha',
    slug: 'son-tuong-noi-that',
    name: 'Sơn tường nội thất',
    basePrice: 300000,
    estimatedDurationMinutes: 180,
    pricingType: 'FROM',
    description: 'Dặm vá tường bong tróc, nứt chân chim, sơn phủ lại phòng ngủ, phòng khách.',
  },
  {
    categorySlug: 'do-gia-dung',
    slug: 'sua-may-giat',
    name: 'Sửa máy giặt',
    basePrice: 180000,
    estimatedDurationMinutes: 90,
    pricingType: 'FROM',
    description: 'Sửa máy giặt không cấp nước, không vắt, rung lắc mạnh khi hoạt động.',
  },
  {
    categorySlug: 'diet-con-trung',
    slug: 'phun-thuoc-diet-muoi',
    name: 'Phun thuốc diệt muỗi',
    basePrice: 350000,
    estimatedDurationMinutes: 60,
    pricingType: 'FIXED',
    description: 'Phun thuốc phòng chống muỗi và côn trùng gây hại cho nhà ở dưới 100m2.',
  },
];

async function seed() {
  await connectDB();

  // 1) Migration — raw collection ops bypass strict schema for legacy data
  const renamed = await ProviderProfile.collection.updateMany(
    { serviceCategories: { $exists: true } },
    { $rename: { serviceCategories: 'skills' } },
  );
  const reStatused = await ProviderProfile.collection.updateMany(
    { verificationStatus: 'APPROVED' },
    { $set: { verificationStatus: 'VERIFIED' } },
  );
  const backfilled = await ServiceCategory.collection.updateMany(
    { pricingMode: { $exists: false } },
    { $set: { pricingMode: 'FIXED' } },
  );
  await ServiceCategory.collection.updateMany({ icon: { $exists: false } }, { $set: { icon: 'wrench' } });

  // 2) Catalogue Categories
  const categoryIdMap = {};
  for (const { slug, isActive = true, ...fields } of CATALOG) {
    const updatedCat = await ServiceCategory.findOneAndUpdate(
      { slug },
      {
        $set: { ...fields, isActive, ...(isActive ? {} : { deactivatedAt: new Date() }) },
        ...(isActive ? { $unset: { deactivatedAt: 1 } } : {}),
      },
      { upsert: true, new: true },
    );
    categoryIdMap[slug] = updatedCat._id;
  }

  // 3) Services
  for (const { categorySlug, ...serviceFields } of SERVICES) {
    const categoryId = categoryIdMap[categorySlug];
    if (categoryId) {
      await Service.updateOne(
        { slug: serviceFields.slug },
        {
          $set: {
            ...serviceFields,
            category: categoryId,
            isActive: true,
          },
        },
        { upsert: true },
      );
    }
  }

  // 4) Admin & Staff accounts
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await User.updateOne(
    { email: 'admin.demo@homecare.local' },
    {
      $set: {
        email: 'admin.demo@homecare.local',
        fullName: 'Quản trị viên Demo',
        phone: '0955555555',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        tokenVersion: 0,
        passwordHash,
      },
    },
    { upsert: true },
  );

  await User.updateOne(
    { email: 'staff.demo@homecare.local' },
    {
      $set: {
        email: 'staff.demo@homecare.local',
        fullName: 'Nhân viên Thẩm định Demo',
        phone: '0966666666',
        role: 'STAFF',
        status: 'ACTIVE',
        emailVerified: true,
        tokenVersion: 0,
        passwordHash,
      },
    },
    { upsert: true },
  );

  const [active, inactive, totalServices] = await Promise.all([
    ServiceCategory.countDocuments({ isActive: { $ne: false } }),
    ServiceCategory.countDocuments({ isActive: false }),
    Service.countDocuments({ isActive: true }),
  ]);

  console.log(`
Catalog seed completed (password: ${PASSWORD})
  Migrated profiles : ${renamed.modifiedCount} (serviceCategories -> skills), ${reStatused.modifiedCount} (APPROVED -> VERIFIED)
  Back-filled cats  : ${backfilled.modifiedCount} (pricingMode)
  Categories        : ${active} active, ${inactive} inactive
  Services          : ${totalServices} active services
  Admin             : admin.demo@homecare.local   -> /admin/categories & /admin/providers
  Staff             : staff.demo@homecare.local   -> /admin/providers (UC-08 verification)
`);
  process.exit(0);
}

seed().catch((error) => {
  console.error('Catalog seed error:', error);
  process.exit(1);
});
