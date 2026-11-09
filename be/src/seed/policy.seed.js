/**
 * Seed script for Legal Policies (Privacy Policy, Terms of Service, Provider Contract)
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const mongoose = require('mongoose');
const { connectDB } = require('../config/db.js');
const { Policy, UserConsent } = require('../modules/policy/policy.model.js');
const User = require('../modules/users/user.model.js');

const SAMPLE_POLICIES = [
  {
    title: 'Chính sách bảo mật thông tin người dùng',
    type: 'PRIVACY_POLICY',
    version: 'v1.0',
    isMandatory: true,
    isActive: true,
    summary: 'Quy định về thu thập, xử lý, mã hóa dữ liệu vị trí GPS, số điện thoại và bảo vệ quyền riêng tư người dùng.',
    effectiveDate: new Date('2026-01-01'),
    content: `
      <h2>1. Mục đích thu thập thông tin</h2>
      <p>HomeHero thu thập dữ liệu cá nhân của khách hàng và thợ kỹ thuật nhằm phục vụ mục đích kết nối dịch vụ sửa chữa gia đình, xác minh danh tính và đảm bảo an toàn giao dịch.</p>
      
      <h2>2. Phạm vi thu thập dữ liệu</h2>
      <ul>
        <li><strong>Thông tin cơ bản:</strong> Họ tên, số điện thoại, địa chỉ email, ảnh đại diện.</li>
        <li><strong>Dữ liệu vị trí:</strong> Tọa độ định vị GPS được sử dụng để tìm kiếm thợ gần nhất và tính toán quãng đường di chuyển.</li>
        <li><strong>Dữ liệu đối tác:</strong> Căn cước công dân (CCCD), chứng chỉ nghề nghiệp và giấy phép kinh doanh phục vụ công tác xét duyệt.</li>
      </ul>

      <h2>3. Bảo mật và lưu trữ</h2>
      <p>Mọi thông tin thanh toán, mật khẩu đều được băm bằng thuật toán an toàn (bcrypt cost 12). Chứng từ cá nhân được lưu trữ bảo mật trên hạ tầng đám mây và chỉ nhân viên có thẩm quyền mới được truy cập thẩm định.</p>

      <h2>4. Quyền của chủ thể dữ liệu</h2>
      <p>Người dùng có quyền tra cứu, cập nhật thông tin cá nhân hoặc yêu cầu khóa/xóa tài khoản theo quy định pháp luật.</p>
    `.trim(),
  },
  {
    title: 'Điều khoản & Quy định sử dụng dịch vụ HomeHero',
    type: 'TERMS_OF_SERVICE',
    version: 'v1.0',
    isMandatory: true,
    isActive: true,
    summary: 'Các điều khoản sử dụng nền tảng, quyền và nghĩa vụ của khách hàng khi đặt dịch vụ sửa chữa tại nhà.',
    effectiveDate: new Date('2026-01-01'),
    content: `
      <h2>1. Chấp thuận điều khoản</h2>
      <p>Bằng việc đăng ký tài khoản hoặc sử dụng ứng dụng HomeHero, bạn đồng ý tuân thủ toàn bộ các điều khoản và quy chế hoạt động được nêu trong văn bản này.</p>

      <h2>2. Quy trình đặt lịch và hủy lịch</h2>
      <ul>
        <li>Khách hàng cung cấp mô tả chi tiết, hình ảnh sự cố và địa chỉ thực hiện chính xác.</li>
        <li>Khách hàng có thể hủy lịch miễn phí trước khi thợ xuất phát. Khi thợ đã trên đường đến (PROVIDER_ON_THE_WAY), việc hủy lịch có thể phát sinh phí di chuyển cơ bản.</li>
      </ul>

      <h2>3. Giá cả và thanh toán</h2>
      <p>Giá dịch vụ có thể là giá cố định (FIXED) hoặc theo khảo sát thực tế (REQUEST_QUOTE). Thợ không được tự ý thu thêm phụ phí ngoài thỏa thuận trên hệ thống.</p>

      <h2>4. Giải quyết tranh chấp và bảo hành</h2>
      <p>Mọi khiếu nại về chất lượng công việc cần được gửi qua tính năng Khiếu nại trong vòng 72 giờ kể từ khi hoàn tất dịch vụ để ban quản trị điều tra và bồi hoàn thỏa đáng.</p>
    `.trim(),
  },
  {
    title: 'Hợp đồng nguyên tắc & Cam kết đối tác cung ứng dịch vụ',
    type: 'PROVIDER_CONTRACT',
    version: 'v1.0',
    isMandatory: true,
    isActive: true,
    summary: 'Hợp đồng hợp tác điện tử dành cho thợ kỹ thuật và đối tác thi công dịch vụ trên hệ thống.',
    effectiveDate: new Date('2026-01-01'),
    content: `
      <h2>1. Tư cách đối tác</h2>
      <p>Thợ tham gia nền tảng HomeHero cam kết có đầy đủ năng lực hành vi dân sự, tay nghề chuyên môn và cung cấp giấy tờ tùy thân chính chủ đã qua xác thực.</p>

      <h2>2. Tiêu chuẩn dịch vụ và đạo đức nghề nghiệp</h2>
      <ul>
        <li>Đến đúng giờ hẹn, mặc trang phục lịch sự, mang đầy đủ trang thiết bị bảo hộ và đồ nghề chuyên dụng.</li>
        <li>Không phát sinh báo giá sai lệch hoặc ép giá khách hàng ngoài hệ thống.</li>
        <li>Bảo quản tài sản của khách hàng trong suốt quá trình thi công.</li>
      </ul>

      <h2>3. Phí nền tảng và gói hội viên</h2>
      <p>Đối tác đóng phí duy trì kết nối theo các gói hội viên (Standard, Pro, Enterprise) qua cổng thanh toán tích hợp PayOS để nhận việc không giới hạn.</p>

      <h2>4. Chế tài vi phạm</h2>
      <p>Các hành vi gian lận, hủy đơn tùy tiện hoặc bị đánh giá dưới 3 sao nhiều lần sẽ bị tạm ngưng tài khoản hoặc chấm dứt hợp tác vĩnh viễn.</p>
    `.trim(),
  },
];

async function seedPolicies() {
  await connectDB();
  console.log('Seeding Policies & Terms...');

  const admin = await User.findOne({ role: 'ADMIN' });

  for (const item of SAMPLE_POLICIES) {
    const existing = await Policy.findOne({ type: item.type, version: item.version });
    if (!existing) {
      await Policy.create({
        ...item,
        createdBy: admin?._id,
      });
      console.log(`+ Created policy: [${item.type}] ${item.version} - ${item.title}`);
    } else {
      await Policy.updateOne(
        { _id: existing._id },
        {
          $set: {
            title: item.title,
            content: item.content,
            isActive: item.isActive,
            isMandatory: item.isMandatory,
            summary: item.summary,
            effectiveDate: item.effectiveDate,
          },
        }
      );
      console.log(`= Updated existing policy: [${item.type}] ${item.version}`);
    }
  }

  console.log('Legal Policies seeding complete!');
}

if (require.main === module) {
  seedPolicies()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Policy seed failed:', err);
      process.exit(1);
    });
}

module.exports = { seedPolicies, SAMPLE_POLICIES };
