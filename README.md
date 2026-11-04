# Home Service Booking System (SDN302 - Team 5)

> Hệ thống Nền tảng Đặt dịch vụ Sửa chữa & Tiện ích Gia đình tại nhà, kết nối Khách hàng với Thợ kỹ thuật lành nghề.
> Môn học: **SWD392 / SDN302 - Software Architecture and Design** | Học kỳ: **Fall 2026**

---

## 1. TỔNG QUAN DỰ ÁN & TECH STACK

Dự án được xây dựng theo kiến trúc phân tán đa nền tảng (Monorepo), bao gồm 3 phân hệ chính:

- **Backend RESTful API (`be/`)**:
  - Công nghệ: Node.js, Express.js 5, MongoDB Atlas, Mongoose 8.x.
  - Tính năng: Xác thực JWT Bearer, Email OTP (TTL 15m), Google OAuth, MongoDB Multi-Document Transactions, Geolocation 2dsphere matching (Haversine & Bayesian rating).
- **Web Portal (`fe/web/`)**:
  - Công nghệ: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide icons.
  - Phân hệ: Cổng Quản trị viên (Admin Portal) quản lý người dùng, danh mục; Cổng Đối tác Thợ (Provider Portal) theo dõi đơn hàng và cập nhật tiến độ thi công.
- **Mobile Application (`fe/mobile/`)**:
  - Công nghệ: React Native, Expo SDK, TypeScript, Zustand store, React Navigation.
  - Phân hệ: Ứng dụng di động đa nền tảng (iOS, Android) dành cho Khách hàng (đăng yêu cầu, so sánh báo giá, theo dõi thợ, khiếu nại) và Thợ (nhận việc, gửi báo giá, duyệt đơn).

---

## 2. HỆ THỐNG TÀI LIỆU TOÀN DIỆN (DOCUMENTATION HUB)

Toàn bộ tài liệu kỹ thuật, báo cáo môn học, đặc tả API và kiến trúc thực tế được lưu trữ tập trung tại thư mục **[`docs/`](docs/)**:

- **Bản đồ tài liệu tổng thể**: Xem tại [**`docs/README.md`**](docs/README.md).
- **Báo cáo Đồ án Môn học**: [**`docs/report/SWD392_Course_Project_Report.md`**](docs/report/SWD392_Course_Project_Report.md).
- **Báo cáo Kiểm toán Hệ thống**: [**`docs/audit/AUDIT_REPORT.md`**](docs/audit/AUDIT_REPORT.md).
- **Dữ liệu Jira Backlog**: [**`docs/audit/Jira.csv`**](docs/audit/Jira.csv).
- **System Atlas (Kiến trúc Thực tế As-Built)**:
  - Bản tóm tắt cho AI: [**`docs/atlas/CONTEXT_SUMMARY.md`**](docs/atlas/CONTEXT_SUMMARY.md).
  - Tài liệu gộp Phần 1: [**`docs/atlas/PROJECT_ATLAS_PART1.md`**](docs/atlas/PROJECT_ATLAS_PART1.md).
  - Tài liệu gộp Phần 2: [**`docs/atlas/PROJECT_ATLAS_PART2.md`**](docs/atlas/PROJECT_ATLAS_PART2.md).
  - Danh mục chi tiết: Xem tại [**`docs/atlas/00_README.md`**](docs/atlas/00_README.md).
- **Đặc tả Kỹ thuật & Thiết kế**: Xem tại [**`docs/specifications/`**](docs/specifications/).
- **Hướng dẫn Phát triển Mobile**: Xem tại [**`docs/mobile/`**](docs/mobile/).

---

## 3. HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### 3.1. Khởi động Backend API (`be/`)
```bash
cd be
cp .env.example .env     # Cấu hình biến môi trường MongoDB URI, JWT secret, Gmail SMTP
npm install
npm run seed            # Nạp dữ liệu mẫu ban đầu (danh mục, dịch vụ, tài khoản test)
npm run dev             # Máy chủ chạy tại http://localhost:5000
```

### 3.2. Khởi động Cổng Web Admin & Thợ (`fe/web/`)
```bash
cd fe/web
npm install
npm run dev             # Mở trình duyệt tại http://localhost:3000
```

### 3.3. Khởi động Ứng dụng Di động Mobile (`fe/mobile/`)
```bash
cd fe/mobile
npm install
npm start               # Khởi động Expo Metro Bundler
# Quét mã QR bằng ứng dụng Expo Go trên điện thoại thật hoặc mở giả lập Android / iOS
```

---

## 4. BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TESTS)

Hệ thống cung cấp bộ kiểm thử logic lõi gồm 54 bài kiểm tra tự động đạt 100%:

```powershell
# Chạy toàn bộ 9 bộ test suites của Backend:
node --test be/test/admin.user.validation.test.js be/test/auth.email-verification.test.js be/test/auth.validation.test.js be/test/request.validation.test.js be/test/provider.matching.test.js be/test/provider.recommendation.test.js be/test/booking.provider.test.js be/test/booking.lifecycle.test.js be/test/complaint.validation.test.js

# Kiểm tra kiểu tĩnh TypeScript cho Mobile App:
node fe/mobile/node_modules/typescript/bin/tsc --project fe/mobile/tsconfig.json --noEmit
```
