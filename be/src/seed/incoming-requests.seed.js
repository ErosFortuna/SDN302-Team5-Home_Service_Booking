/**
 * Demo data for UC-35 (View Incoming Requests).
 *
 *   npm run seed:requests
 *
 * Creates / resets:
 *  - Categories: Điện nước, Điện lạnh, Dọn dẹp nhà  (+ services for each)
 *  - provider.demo@homecare.local   → VERIFIED, skills [Điện nước, Điện lạnh], areas [Quận 1, Quận 3, Bình Thạnh]
 *  - provider.pending@homecare.local → PENDING  (to test the 403 "not approved" flow)
 *  - 9 service requests: 5 should appear in the demo provider's inbox, 4 must be filtered out.
 *
 * Password for every demo account: Demo123!
 */
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { connectDB } = require("../config/db.js");
const User = require("../modules/users/user.model.js");
const ServiceCategory = require("../modules/categories/service-category.model.js");
const Service = require("../modules/services/service.model.js");
const ProviderProfile = require("../modules/providers/provider.model.js");
const ServiceRequest = require("../modules/requests/request.model.js");

const PASSWORD = "Demo123!";
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const now = Date.now();
const at = (offsetMs) => new Date(now + offsetMs);
// Fixed ids keep the script idempotent.
const requestId = (n) => new mongoose.Types.ObjectId(`66f1000000000000000000${String(n).padStart(2, "0")}`);

async function upsert(Model, filter, doc) {
  await Model.updateOne(filter, { $setOnInsert: { ...filter, ...doc } }, { upsert: true });
  return Model.findOne(filter);
}

async function seed() {
await connectDB();
const passwordHash = await bcrypt.hash(PASSWORD, 12);

// ── Users ────────────────────────────────────────────────────────────────
const provider = await upsert(User, { email: "provider.demo@homecare.local" },
  { fullName: "Thợ Demo Phát Đạt", phone: "0911111111", role: "PROVIDER", status: "ACTIVE", passwordHash });
const pendingProvider = await upsert(User, { email: "provider.pending@homecare.local" },
  { fullName: "Thợ Mới Chờ Duyệt", phone: "0933333333", role: "PROVIDER", status: "ACTIVE", passwordHash });
const customer = await upsert(User, { email: "customer.demo@homecare.local" },
  { fullName: "Nguyễn Thị Thanh", phone: "0922222222", role: "CUSTOMER", status: "ACTIVE", passwordHash });
const customer2 = await upsert(User, { email: "customer2.demo@homecare.local" },
  { fullName: "Trần Minh Khoa", phone: "0944444444", role: "CUSTOMER", status: "ACTIVE", passwordHash });

// ── Categories & services ────────────────────────────────────────────────
const plumbing = await upsert(ServiceCategory, { slug: "dien-nuoc" }, { name: "Điện nước", sortOrder: 1 });
const aircon = await upsert(ServiceCategory, { slug: "dien-lanh" }, { name: "Điện lạnh", sortOrder: 2 });
const cleaning = await upsert(ServiceCategory, { slug: "don-dep-nha" }, { name: "Dọn dẹp nhà", sortOrder: 3 });

const svc = async (slug, name, category, basePrice, estimatedDurationMinutes) =>
  upsert(Service, { slug }, { name, category: category._id, basePrice, estimatedDurationMinutes, pricingType: "QUOTE_REQUIRED" });

const pipeRepair = await svc("sua-ong-nuoc-ro-ri", "Sửa ống nước rò rỉ", plumbing, 150000, 60);
const electricRepair = await svc("sua-dien-dan-dung", "Sửa điện dân dụng", plumbing, 120000, 60);
const sanitaryInstall = await svc("lap-dat-thiet-bi-ve-sinh", "Lắp đặt thiết bị vệ sinh", plumbing, 250000, 120);
const acRepair = await svc("sua-may-lanh", "Sửa máy lạnh", aircon, 200000, 90);
const acCleaning = await svc("ve-sinh-may-lanh", "Vệ sinh máy lạnh", aircon, 150000, 60);
const houseCleaning = await svc("don-dep-nha-theo-gio", "Dọn dẹp nhà theo giờ", cleaning, 90000, 120);

// ── Provider profiles ────────────────────────────────────────────────────
await ProviderProfile.updateOne(
  { user: provider._id },
  {
    $set: {
      businessName: "Điện Nước Phát Đạt",
      yearsOfExperience: 6,
      verificationStatus: "VERIFIED",
      skills: [plumbing._id, aircon._id],
      serviceAreas: ["Quận 1", "Quận 3", "Bình Thạnh"],
      city: "TP.HCM",
      averageRating: 4.8,
      reviewCount: 42,
      completedJobCount: 56,
      location: { type: "Point", coordinates: [106.7009, 10.7769] },
    },
  },
  { upsert: true },
);
await ProviderProfile.updateOne(
  { user: pendingProvider._id },
  { $set: { verificationStatus: "PENDING", skills: [plumbing._id], serviceAreas: ["Quận 1"] } },
  { upsert: true },
);

// ── Service requests ─────────────────────────────────────────────────────
const addr = (addressLine, ward, district, recipientName = "Nguyễn Thị Thanh", coords = [106.7009, 10.7769]) => ({
  recipientName, phone: "0922222222", addressLine, ward, district, city: "TP.HCM",
  location: { type: "Point", coordinates: coords },
});

const REQUESTS = [
  // ✅ Should appear (5)
  {
    _id: requestId(1), customer: customer._id, service: pipeRepair._id, status: "OPEN",
    description: "Ống thoát nước dưới bồn rửa chén bị rò rỉ liên tục, nước đọng đầy tủ bếp. Đã khóa van tạm thời nhưng vẫn nhỏ giọt. Cần thợ đến xử lý gấp trong hôm nay.",
    address: addr("45 Nguyễn Huệ, Tầng 12 căn 12.05", "Bến Nghé", "Quận 1", "Nguyễn Thị Thanh", [106.7032, 10.7745]),
    preferredStartAt: at(3 * HOUR), preferredEndAt: at(5 * HOUR), budgetMin: 150000, budgetMax: 400000,
    attachments: ["/demo-requests/leaking-sink-pipe.jpg"],
    aiAnalysis: {
      summary: "Rò rỉ tại khớp nối ống xi-phông (P-trap) dưới bồn rửa, có dấu hiệu gioăng cao su bị lão hóa.",
      suspectedIssue: "Hỏng gioăng / lỏng khớp nối ống xi-phông PVC",
      urgency: "HIGH", estimatedPriceMin: 180000, estimatedPriceMax: 350000,
      suggestedTools: ["Mỏ lết", "Gioăng cao su Ø42", "Băng tan", "Keo dán PVC"],
      recommendations: ["Mang theo bộ xi-phông dự phòng", "Kiểm tra thêm van khóa góc", "Lau khô tủ bếp tránh mục gỗ"],
      confidence: 0.86, analyzedAt: at(-20 * MIN),
    },
    createdAt: at(-25 * MIN),
  },
  {
    _id: requestId(2), customer: customer2._id, service: acRepair._id, status: "QUOTED",
    description: "Máy lạnh Daikin 1.5HP phòng ngủ chảy nước xuống tường, chạy khoảng 30 phút là nước nhỏ giọt ướt cả đầu giường. Máy đã dùng 3 năm, chưa vệ sinh lần nào.",
    address: addr("120/8 Xô Viết Nghệ Tĩnh", "Phường 21", "Bình Thạnh", "Trần Minh Khoa", [106.7118, 10.8031]),
    preferredStartAt: at(26 * HOUR), preferredEndAt: at(28 * HOUR), budgetMin: 200000, budgetMax: 500000,
    attachments: ["/demo-requests/ac-dripping-water.jpg"],
    aiAnalysis: {
      summary: "Nước chảy ra từ dàn lạnh, khả năng cao do ống thoát nước ngưng tụ bị tắc vì bụi bẩn lâu ngày.",
      suspectedIssue: "Tắc ống thoát nước dàn lạnh / máng nước bẩn",
      urgency: "MEDIUM", estimatedPriceMin: 200000, estimatedPriceMax: 450000,
      suggestedTools: ["Máy xịt rửa áp lực", "Túi trùm vệ sinh", "Bơm thông ống"],
      recommendations: ["Đề xuất kết hợp vệ sinh toàn bộ máy", "Kiểm tra độ nghiêng dàn lạnh", "Kiểm tra gas nếu dàn lạnh đóng tuyết"],
      confidence: 0.78, analyzedAt: at(-2 * HOUR),
    },
    createdAt: at(-2 * HOUR - 10 * MIN),
  },
  {
    _id: requestId(3), customer: customer._id, service: electricRepair._id, status: "OPEN",
    description: "Ổ cắm phòng khách bị cháy đen, có mùi khét và CB tổng nhảy khi cắm ấm siêu tốc. Hiện đã ngắt CB khu vực đó, nhà có trẻ nhỏ nên cần xử lý khẩn cấp.",
    address: addr("88 Võ Văn Tần", "Phường 6", "Quận 3", "Nguyễn Thị Thanh", [106.6908, 10.7781]),
    preferredStartAt: at(1 * HOUR), preferredEndAt: at(3 * HOUR), budgetMin: 100000, budgetMax: 600000,
    attachments: ["/demo-requests/burnt-wall-socket.jpg", "/demo-requests/leaking-sink-pipe.jpg"],
    aiAnalysis: {
      summary: "Ổ cắm quá tải dẫn đến chập cháy cục bộ, làm nhảy CB. Vỏ nhựa cháy sém, cần thay cụm ổ cắm mới và đo tải đường dây.",
      suspectedIssue: "Cháy tiếp điểm ổ cắm do tiếp xúc kém / quá dòng",
      urgency: "EMERGENCY", estimatedPriceMin: 120000, estimatedPriceMax: 300000,
      suggestedTools: ["Bút thử điện", "Kìm tuốt dây", "Tua vít cách điện", "Đồng hồ vạn năng VOM"],
      recommendations: ["Thay cụm đế âm + mặt hạt ổ cắm mới chịu tải 16A", "Bấm lại đầu cos dây nguồn", "Giữ ngắt CB nhánh này cho tới khi thợ tới"],
      confidence: 0.92, analyzedAt: at(-5 * MIN),
    },
    createdAt: at(-10 * MIN),
  },
  {
    _id: requestId(4), customer: customer2._id, service: sanitaryInstall._id, status: "OPEN",
    description: "Mới mua bộ vòi sen tắm cây Inax và vòi xịt toilet, cần thợ đến khoan bắt tường và đấu nối đường cấp nước. Nhà có sẵn đường ống chờ.",
    address: addr("320 Điện Biên Phủ", "Phường 17", "Bình Thạnh", "Trần Minh Khoa", [106.7088, 10.7981]),
    preferredStartAt: at(50 * HOUR), preferredEndAt: at(54 * HOUR), budgetMin: 250000, budgetMax: 500000,
    attachments: [],
    createdAt: at(-6 * HOUR),
  },
  {
    _id: requestId(5), customer: customer._id, service: acCleaning._id, status: "OPEN",
    description: "Cần vệ sinh định kỳ 2 máy lạnh treo tường Panasonic (1 phòng khách 2HP, 1 phòng ngủ 1HP). Máy vẫn chạy bình thường, chỉ muốn bảo dưỡng trước mùa nóng.",
    address: addr("15 Lê Duẩn, Căn hộ A-08", "Bến Nghé", "Quận 1", "Nguyễn Thị Thanh", [106.7001, 10.7812]),
    preferredStartAt: at(74 * HOUR), preferredEndAt: at(76 * HOUR), budgetMin: 300000, budgetMax: 450000,
    attachments: [],
    createdAt: at(-1 * HOUR),
  },

  // ❌ Filtered out (4)
  // [6] Cleaning category -> provider does not have this skill
  {
    _id: requestId(6), customer: customer._id, service: houseCleaning._id, status: "OPEN",
    description: "Dọn dẹp căn hộ 2 phòng ngủ 70m2, lau kính ban công và dọn bếp.",
    address: addr("45 Nguyễn Huệ", "Bến Nghé", "Quận 1"),
    preferredStartAt: at(4 * HOUR), preferredEndAt: at(6 * HOUR), budgetMin: 180000, budgetMax: 300000,
    createdAt: at(-30 * MIN),
  },
  // [7] Quận 7 -> out of provider's serviceAreas
  {
    _id: requestId(7), customer: customer2._id, service: pipeRepair._id, status: "OPEN",
    description: "Vòi nước bồn rửa mặt bị gãy chân ren trong tường, cần đục nhẹ để lấy ren gãy ra và thay vòi mới.",
    address: addr("15 Nguyễn Lương Bằng", "Tân Phú", "Quận 7", "Trần Minh Khoa", [106.7198, 10.7291]),
    preferredStartAt: at(5 * HOUR), preferredEndAt: at(7 * HOUR), budgetMin: 200000, budgetMax: 400000,
    createdAt: at(-45 * MIN),
  },
  // [8] Already BOOKED -> not incoming
  {
    _id: requestId(8), customer: customer._id, service: electricRepair._id, status: "BOOKED",
    description: "Lắp đặt thêm 3 bóng đèn LED âm trần phòng làm việc.",
    address: addr("45 Nguyễn Huệ", "Bến Nghé", "Quận 1"),
    preferredStartAt: at(12 * HOUR), preferredEndAt: at(14 * HOUR), budgetMin: 200000, budgetMax: 350000,
    createdAt: at(-24 * HOUR),
  },
  // [9] Expired -> not incoming
  {
    _id: requestId(9), customer: customer2._id, service: acRepair._id, status: "OPEN",
    description: "Cần thợ gấp xử lý máy lạnh bị xì gas từ tối qua.",
    address: addr("88 Võ Văn Tần", "Phường 6", "Quận 3", "Trần Minh Khoa"),
    preferredStartAt: at(-2 * HOUR), preferredEndAt: at(-1 * HOUR), budgetMin: 300000, budgetMax: 700000,
    expiresAt: at(-30 * MIN),
    createdAt: at(-8 * HOUR),
  },
];

await ServiceRequest.deleteMany({ _id: { $in: REQUESTS.map((r) => r._id) } });

for (const req of REQUESTS) {
  const service = await Service.findById(req.service).select("category");
  await ServiceRequest.create({ ...req, category: service.category });
}

console.log(`
Incoming requests seed completed!
  Provider (VERIFIED) : provider.demo@homecare.local  / ${PASSWORD}
  Provider (PENDING)  : provider.pending@homecare.local / ${PASSWORD}
  Customer            : customer.demo@homecare.local  / ${PASSWORD}
  Created ${REQUESTS.length} requests (5 open to provider.demo, 4 filtered).
`);
process.exit(0);
}

seed().catch((err) => {
console.error(err);
process.exit(1);
});
