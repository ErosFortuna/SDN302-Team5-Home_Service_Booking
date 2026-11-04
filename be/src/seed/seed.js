const bcrypt = require("bcryptjs");
const { connectDB } = require("../config/db.js");
const User = require("../modules/users/user.model.js");
const Service = require("../modules/services/service.model.js");
const ServiceCategory = require("../modules/categories/service-category.model.js");
const ProviderProfile = require("../modules/providers/provider.model.js");
const Availability = require("../modules/availability/availability.model.js");

const DEMO_PASSWORD = "Demo123!";
const ADMIN_PASSWORD = "ChangeMe123!";

async function seed() {
  await connectDB();

  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // 1. Core Users (Admin, Staff, Provider, Customer)
  const usersToSeed = [
    {
      email: "admin@homecare.local",
      fullName: "System Admin",
      phone: "0900000000",
      passwordHash: adminHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
    {
      email: "admin.demo@homecare.local",
      fullName: "Quản trị viên Demo",
      phone: "0955555555",
      passwordHash: demoHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
    },
    {
      email: "staff.demo@homecare.local",
      fullName: "Nhân viên CSKH Demo",
      phone: "0966666666",
      passwordHash: demoHash,
      role: "STAFF",
      status: "ACTIVE",
      emailVerified: true,
    },
    {
      email: "provider.demo@homecare.local",
      fullName: "Thợ Demo Phát Đạt",
      phone: "0911111111",
      passwordHash: demoHash,
      role: "PROVIDER",
      status: "ACTIVE",
      emailVerified: true,
    },
    {
      email: "customer.demo@homecare.local",
      fullName: "Nguyễn Thị Thanh",
      phone: "0922222222",
      passwordHash: demoHash,
      role: "CUSTOMER",
      status: "ACTIVE",
      emailVerified: true,
    },
  ];

  for (const user of usersToSeed) {
    await User.updateOne(
      { email: user.email },
      { $set: user },
      { upsert: true },
    );
  }

  // 2. Service Categories
  const categories = [
    { name: "Điện nước", slug: "dien-nuoc", icon: "droplets", description: "Sửa chữa, lắp đặt hệ thống điện và đường ống nước dân dụng", pricingMode: "FIXED", sortOrder: 1, isActive: true },
    { name: "Điện lạnh", slug: "dien-lanh", icon: "snowflake", description: "Sửa chữa, bảo dưỡng máy lạnh, tủ lạnh, máy nước nóng", pricingMode: "FIXED", sortOrder: 2, isActive: true },
    { name: "Dọn dẹp nhà", slug: "don-dep-nha", icon: "sparkles", description: "Dọn dẹp nhà cửa, văn phòng, vệ sinh định kỳ", pricingMode: "FIXED", sortOrder: 3, isActive: true },
    { name: "Sửa khóa", slug: "sua-khoa", icon: "key", description: "Mở khóa, thay ổ khóa, lắp đặt khóa cửa", pricingMode: "FIXED", sortOrder: 4, isActive: true },
    { name: "Sơn sửa nhà", slug: "son-sua-nha", icon: "paintbrush", description: "Sơn tường, dặm vá, chống thấm và hoàn thiện nội thất", pricingMode: "FIXED", sortOrder: 5, isActive: true },
  ];

  const categoryMap = {};
  for (const category of categories) {
    const updated = await ServiceCategory.findOneAndUpdate(
      { slug: category.slug },
      { $set: category },
      { upsert: true, new: true },
    );
    categoryMap[category.slug] = updated._id;
  }

  // 3. Services
  const services = [
    {
      name: "Sửa ống nước rò rỉ",
      slug: "sua-ong-nuoc-ro-ri",
      categorySlug: "dien-nuoc",
      pricingType: "FIXED",
      basePrice: 150000,
      estimatedDurationMinutes: 60,
      description: "Khắc phục triệt để rò rỉ đường ống nước, van khóa, vòi rửa",
      isActive: true,
    },
    {
      name: "Sửa điện dân dụng",
      slug: "sua-dien-dan-dung",
      categorySlug: "dien-nuoc",
      pricingType: "FROM",
      basePrice: 120000,
      estimatedDurationMinutes: 60,
      description: "Xử lý chập điện, nhảy CB, thay ổ cắm công tắc",
      isActive: true,
    },
    {
      name: "Vệ sinh máy lạnh",
      slug: "ve-sinh-may-lanh",
      categorySlug: "dien-lanh",
      pricingType: "FIXED",
      basePrice: 150000,
      estimatedDurationMinutes: 60,
      description: "Vệ sinh dàn nóng, dàn lạnh, kiểm tra lượng gas định kỳ",
      isActive: true,
    },
    {
      name: "Sửa máy lạnh",
      slug: "sua-may-lanh",
      categorySlug: "dien-lanh",
      pricingType: "FROM",
      basePrice: 200000,
      estimatedDurationMinutes: 90,
      description: "Kiểm tra và sửa chữa máy lạnh không lạnh, chảy nước, xì gas",
      isActive: true,
    },
    {
      name: "Dọn dẹp nhà theo giờ",
      slug: "don-dep-nha-theo-gio",
      categorySlug: "don-dep-nha",
      pricingType: "FIXED",
      basePrice: 90000,
      estimatedDurationMinutes: 120,
      description: "Lau dọn nhà cửa, sắp xếp đồ đạc theo giờ linh hoạt",
      isActive: true,
    },
    {
      name: "Mở khóa tại nhà",
      slug: "mo-khoa-tai-nha",
      categorySlug: "sua-khoa",
      pricingType: "FROM",
      basePrice: 150000,
      estimatedDurationMinutes: 45,
      description: "Xử lý kẹt khóa, mất chìa khóa cửa phòng, khóa cổng",
      isActive: true,
    },
    {
      name: "Sơn tường nội thất",
      slug: "son-tuong-noi-that",
      categorySlug: "son-sua-nha",
      pricingType: "FROM",
      basePrice: 300000,
      estimatedDurationMinutes: 180,
      description: "Dặm vá tường nứt, sơn lại phòng ngủ, phòng khách",
      isActive: true,
    },
  ];

  for (const { categorySlug, ...service } of services) {
    const categoryId = categoryMap[categorySlug];
    if (categoryId) {
      await Service.updateOne(
        { slug: service.slug },
        { $set: { ...service, category: categoryId } },
        { upsert: true },
      );
    }
  }

  // 4. Provider Profile for provider.demo@homecare.local
  const providerUser = await User.findOne({ email: "provider.demo@homecare.local" });
  if (providerUser) {
    await ProviderProfile.updateOne(
      { user: providerUser._id },
      {
        $set: {
          businessName: "Điện Nước Phát Đạt",
          bio: "Thợ lành nghề với hơn 6 năm kinh nghiệm sửa chữa điện nước, điện lạnh dân dụng tại TP.HCM.",
          yearsOfExperience: 6,
          verificationStatus: "VERIFIED",
          skills: [categoryMap["dien-nuoc"], categoryMap["dien-lanh"]].filter(Boolean),
          serviceAreas: ["Quận 1", "Quận 3", "Bình Thạnh"],
          city: "TP.HCM",
          averageRating: 4.8,
          reviewCount: 42,
          completedJobCount: 56,
          location: { type: "Point", coordinates: [106.7009, 10.7769] },
          isDeleted: false,
        },
      },
      { upsert: true },
    );

    // 5. Provider Availability
    await Availability.findOneAndUpdate(
      { provider: providerUser._id },
      {
        $setOnInsert: {
          provider: providerUser._id,
          weeklySchedule: Availability.getDefaultWeeklySchedule ? Availability.getDefaultWeeklySchedule() : [],
          daysOff: [],
          settings: {
            slotDurationMinutes: 60,
            travelBufferMinutes: 30,
            isAcceptingBookings: true,
          },
        },
      },
      { upsert: true },
    );
  }

  console.log(`
Seed completed successfully!
-----------------------------------------------------------------
Admin Accounts:
  - admin@homecare.local        / ${ADMIN_PASSWORD}
  - admin.demo@homecare.local   / ${DEMO_PASSWORD}

Staff Account:
  - staff.demo@homecare.local   / ${DEMO_PASSWORD}

Provider Account (VERIFIED):
  - provider.demo@homecare.local / ${DEMO_PASSWORD}

Customer Account:
  - customer.demo@homecare.local / ${DEMO_PASSWORD}

Categories & Services: ${categories.length} categories, ${services.length} services seeded.
-----------------------------------------------------------------
`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
