/**
 * Demo data + migration for UC-57/58 (Admin categories) and UC-33 (Provider skills).
 *
 *   npm run seed:catalog
 *
 * - Migrates ProviderProfile.serviceCategories → skills and APPROVED → VERIFIED (old demo data)
 * - Back-fills pricingMode / icon on legacy categories
 * - Upserts a demo catalogue (7 active + 1 inactive category)
 * - Creates admin.demo@homecare.local (ADMIN)
 *
 * Password for demo accounts: Demo123!
 */
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db.js');
const User = require('../modules/users/user.model.js');
const ServiceCategory = require('../modules/categories/service-category.model.js');
const ProviderProfile = require('../modules/providers/provider.model.js');

const PASSWORD = 'Demo123!';

const CATALOG = [
  { slug: 'dien-nuoc', name: 'Điện nước', icon: 'droplets', pricingMode: 'REQUEST_QUOTE', sortOrder: 1, description: 'Sửa chữa, lắp đặt hệ thống điện và đường ống nước dân dụng.' },
  { slug: 'dien-lanh', name: 'Điện lạnh', icon: 'snowflake', pricingMode: 'REQUEST_QUOTE', sortOrder: 2, description: 'Sửa chữa, bảo dưỡng máy lạnh, tủ lạnh, máy nước nóng.' },
  { slug: 'don-dep-nha', name: 'Dọn dẹp nhà', icon: 'sparkles', pricingMode: 'FIXED', sortOrder: 3, description: 'Dọn dẹp theo giờ, tổng vệ sinh định kỳ hoặc sau chuyển nhà.' },
  { slug: 'sua-khoa', name: 'Sửa khóa', icon: 'key', pricingMode: 'FIXED', sortOrder: 4, description: 'Mở khóa, thay ổ khóa, lắp khóa điện tử.' },
  { slug: 'son-sua-nha', name: 'Sơn sửa nhà', icon: 'paintbrush', pricingMode: 'REQUEST_QUOTE', sortOrder: 5, description: 'Sơn tường, chống thấm, sửa chữa nhỏ trong nhà.' },
  { slug: 'do-gia-dung', name: 'Sửa đồ gia dụng', icon: 'washing-machine', pricingMode: 'REQUEST_QUOTE', sortOrder: 6, description: 'Máy giặt, lò vi sóng, bếp từ và thiết bị gia dụng khác.' },
  { slug: 'diet-con-trung', name: 'Diệt côn trùng', icon: 'bug', pricingMode: 'FIXED', sortOrder: 7, description: 'Phun thuốc diệt muỗi, gián, mối theo gói cố định.' },
  { slug: 'chuyen-nha', name: 'Chuyển nhà trọn gói', icon: 'truck', pricingMode: 'REQUEST_QUOTE', sortOrder: 8, isActive: false, description: 'Đóng gói, vận chuyển đồ đạc (tạm ngừng cung cấp).' },
];

async function seed() {
  await connectDB();

  // 1) Migration — raw collection ops bypass the strict schema.
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
    { $set: { pricingMode: 'REQUEST_QUOTE' } },
  );
  await ServiceCategory.collection.updateMany({ icon: { $exists: false } }, { $set: { icon: 'wrench' } });

  // 2) Catalogue — keeps existing _ids (referenced by services/requests/skills).
  for (const { slug, isActive = true, ...fields } of CATALOG) {
    await ServiceCategory.updateOne(
      { slug },
      {
        $set: { ...fields, isActive, ...(isActive ? {} : { deactivatedAt: new Date() }) },
        ...(isActive ? { $unset: { deactivatedAt: 1 } } : {}),
      },
      { upsert: true },
    );
  }

  // 3) Admin account (updateOne bypasses the pre-save hash hook, so hash here)
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await User.updateOne(
    { email: 'admin.demo@homecare.local' },
    { $setOnInsert: { email: 'admin.demo@homecare.local', fullName: 'Quản trị viên Demo', phone: '0955555555', role: 'ADMIN', status: 'ACTIVE', passwordHash } },
    { upsert: true },
  );

  const [active, inactive] = await Promise.all([
    ServiceCategory.countDocuments({ isActive: { $ne: false } }),
    ServiceCategory.countDocuments({ isActive: false }),
  ]);

  console.log(`
Catalog seed completed (password: ${PASSWORD})
  Migrated profiles : ${renamed.modifiedCount} (serviceCategories -> skills), ${reStatused.modifiedCount} (APPROVED -> VERIFIED)
  Back-filled cats  : ${backfilled.modifiedCount} (pricingMode)
  Categories        : ${active} active, ${inactive} inactive
  Admin             : admin.demo@homecare.local   -> /admin/categories
  Provider          : provider.demo@homecare.local -> /provider/skills
`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
