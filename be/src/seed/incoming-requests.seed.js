/**
 * Demo data for UC-35 (View Incoming Requests).
 *
 *   npm run seed:requests
 *
 * Creates / resets:
 *  - Categories: Điện nước, Điện lạnh, Dọn dẹp nhà  (+ services for each)
 *  - provider.demo@homecare.local   → APPROVED, skills [Điện nước, Điện lạnh], areas [Quận 1, Quận 3, Bình Thạnh]
 *  - provider.pending@homecare.local → PENDING  (to test the 403 "not approved" flow)
 *  - 9 service requests: 5 should appear in the demo provider's inbox, 4 must be filtered out.
 *
 * Password for every demo account: Demo123!
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../modules/users/user.model.js";
import ServiceCategory from "../modules/categories/service-category.model.js";
import Service from "../modules/services/service.model.js";
import ProviderProfile from "../modules/providers/provider.model.js";
import ServiceRequest from "../modules/requests/request.model.js";

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
      verificationStatus: "APPROVED",
      serviceCategories: [plumbing._id, aircon._id],
      serviceAreas: ["Quận 1", "Quận 3", "Bình Thạnh"],
    },
  },
  { upsert: true },
);
await ProviderProfile.updateOne(
  { user: pendingProvider._id },
  { $set: { verificationStatus: "PENDING", serviceCategories: [plumbing._id], serviceAreas: ["Quận 1"] } },
  { upsert: true },
);

// ── Service requests ─────────────────────────────────────────────────────
const addr = (addressLine, ward, district, recipientName = "Nguyễn Thị Thanh") => ({
  recipientName, phone: "0922222222", addressLine, ward, district, city: "TP.HCM",
});

const REQUESTS = [
  // ✅ Should appear (5)
  {
    _id: requestId(1), customer: customer._id, service: pipeRepair._id, status: "REQUESTED",
    description: "Ống thoát nước dưới bồn rửa chén bị rò rỉ liên tục, nước đọng đầy tủ bếp. Đã khóa van tạm thời nhưng vẫn nhỏ giọt. Cần thợ đến xử lý gấp trong hôm nay.",
    address: addr("45 Nguyễn Huệ, Tầng 12 căn 12.05", "Bến Nghé", "Quận 1"),
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
    _id: requestId(2), customer: customer2._id, service: acRepair._id, status: "MATCHING",
    description: "Máy lạnh Daikin 1.5HP phòng ngủ chảy nước xuống tường, chạy khoảng 30 phút là nước nhỏ giọt ướt cả đầu giường. Máy đã dùng 3 năm, chưa vệ sinh lần nào.",
    address: addr("120/8 Xô Viết Nghệ Tĩnh", "Phường 21", "Bình Thạnh", "Trần Minh Khoa"),
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
    _id: requestId(3), customer: customer._id, service: electricRepair._id, status: "REQUESTED",
    description: "Ổ cắm phòng khách bị cháy đen, có mùi khét và CB tổng nhảy khi cắm ấm siêu tốc. Hiện đã ngắt CB khu vực đó, nhà có trẻ nhỏ nên cần xử lý khẩn cấp.",
    address: addr("88 Võ Văn Tần", "Phường 6", "Quận 3"),
    preferredStartAt: at(1 * HOUR), preferredEndAt: at(3 * HOUR), budgetMin: 100000, budgetMax: 600000,
    attachments: ["/demo-requests/burnt-wall-socket.jpg", "/demo-requests/leaking-sink-pipe.jpg"],
    aiAnalysis: {
      summary: "Ổ cắm bị quá nhiệt gây cháy vỏ nhựa, có nguy cơ chập dây âm tường. Cần kiểm tra tiết diện dây và tải.",
      suspectedIssue: "Quá tải / tiếp xúc kém tại ổ cắm, nguy cơ cháy dây âm tường",
      urgency: "EMERGENCY", estimatedPriceMin: 150000, estimatedPriceMax: 500000,
      suggestedTools: ["Bút thử điện", "Đồng hồ vạn năng", "Ổ cắm 16A", "Dây điện 2.5mm²"],
      recommendations: ["Ngắt nguồn trước khi tháo", "Kiểm tra dây âm tường phía sau ổ", "Tư vấn khách không dùng thiết bị công suất lớn chung ổ"],
      confidence: 0.91, analyzedAt: at(-5 * MIN),
    },
    createdAt: at(-8 * MIN),
  },
  {
    _id: requestId(4), customer: customer2._id, service: sanitaryInstall._id, status: "REQUESTED",
    description: "Cần lắp mới 1 bồn cầu và 1 lavabo cho nhà tắm vừa sửa xong. Thiết bị đã mua sẵn (TOTO), chỉ cần thợ lắp đặt và đấu nối đường nước.",
    address: addr("12 Lê Thánh Tôn", "Bến Thành", "Quận 1", "Trần Minh Khoa"),
    preferredStartAt: at(50 * HOUR), preferredEndAt: at(54 * HOUR), budgetMin: 400000, budgetMax: 800000,
    createdAt: at(-5 * HOUR),
  },
  {
    _id: requestId(5), customer: customer._id, service: acCleaning._id, status: "MATCHING",
    description: "Vệ sinh định kỳ 2 máy lạnh treo tường (1HP và 1.5HP) cho căn hộ. Máy vẫn chạy tốt, chỉ hơi yếu lạnh và có mùi.",
    address: addr("200 Nam Kỳ Khởi Nghĩa", "Võ Thị Sáu", "Quận 3"),
    preferredStartAt: at(72 * HOUR), preferredEndAt: at(75 * HOUR), budgetMin: 250000, budgetMax: 400000,
    aiAnalysis: {
      summary: "Bảo dưỡng định kỳ, không có dấu hiệu hư hỏng nghiêm trọng.",
      suspectedIssue: "Dàn lạnh bám bụi, lưới lọc bẩn",
      urgency: "LOW", estimatedPriceMin: 250000, estimatedPriceMax: 350000,
      recommendations: ["Báo giá trọn gói cho 2 máy", "Kiểm tra áp suất gas"],
      confidence: 0.7, analyzedAt: at(-1 * HOUR),
    },
    createdAt: at(-1 * HOUR - 5 * MIN),
  },

  // ❌ Must NOT appear
  { // wrong category (provider has no cleaning skill)
    _id: requestId(6), customer: customer._id, service: houseCleaning._id, status: "REQUESTED",
    description: "Cần dọn dẹp tổng vệ sinh căn hộ 2 phòng ngủ sau khi chuyển nhà.",
    address: addr("45 Nguyễn Huệ", "Bến Nghé", "Quận 1"),
    preferredStartAt: at(24 * HOUR), preferredEndAt: at(28 * HOUR), createdAt: at(-30 * MIN),
  },
  { // outside service area (visible only with area=all)
    _id: requestId(7), customer: customer2._id, service: pipeRepair._id, status: "REQUESTED",
    description: "Vòi sen nhà tắm bị rỉ nước ở chân, cần thay mới bộ vòi.",
    address: addr("15 Võ Văn Ngân", "Linh Chiểu", "Thủ Đức", "Trần Minh Khoa"),
    preferredStartAt: at(30 * HOUR), preferredEndAt: at(32 * HOUR), createdAt: at(-40 * MIN),
  },
  { // already booked
    _id: requestId(8), customer: customer._id, service: pipeRepair._id, status: "BOOKED",
    description: "Thông tắc bồn cầu — đã có thợ nhận việc.",
    address: addr("45 Nguyễn Huệ", "Bến Nghé", "Quận 1"),
    preferredStartAt: at(4 * HOUR), preferredEndAt: at(6 * HOUR), createdAt: at(-3 * HOUR),
  },
  { // expired
    _id: requestId(9), customer: customer._id, service: electricRepair._id, status: "REQUESTED",
    description: "Thay bóng đèn LED âm trần phòng khách (yêu cầu đã hết hạn).",
    address: addr("88 Võ Văn Tần", "Phường 6", "Quận 3"),
    preferredStartAt: at(-20 * HOUR), preferredEndAt: at(-18 * HOUR), expiresAt: at(-HOUR), createdAt: at(-26 * HOUR),
  },
];

await ServiceRequest.deleteMany({ _id: { $in: REQUESTS.map((r) => r._id) } });
for (const r of REQUESTS) await ServiceRequest.create(r); // .create() runs the hook that fills `category`

console.log(`
UC-35 demo seed completed (password for all accounts: ${PASSWORD})
  Approved provider : ${provider.email}   → expect 5 incoming requests (6 with area=all)
  Pending provider  : ${pendingProvider.email} → expect 403 PROVIDER_NOT_APPROVED
  Customers         : ${customer.email}, ${customer2.email}
`);
process.exit(0);
