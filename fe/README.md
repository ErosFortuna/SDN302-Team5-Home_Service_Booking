# Home Service Booking - Frontend (`fe`)

Frontend được chia thành 2 ứng dụng độc lập tối ưu cho từng nền tảng:

## 1. Cấu trúc thư mục

```text
fe/
├── web/       # Web Application (Next.js 16 + Tailwind CSS)
└── mobile/    # Mobile Application (React Native + Expo)
```

## 2. Hướng dẫn chạy

### Web Application (`fe/web`)
Ứng dụng Web hoàn chỉnh dành cho máy tính và trình duyệt (Desktop & Responsive Web) với đầy đủ luồng Đặt lịch dịch vụ, So sánh báo giá, Quản lý đơn hàng, Trò chuyện trực tuyến, và Cổng đối tác dành cho Thợ (Dashboard & Sàn nhận việc):

```bash
cd fe/web
npm install   # hoặc pnpm install
npm run dev   # Mở http://localhost:3000
```
Hoặc từ thư mục `fe/`:
```bash
npm run web
```

### Mobile Application (`fe/mobile`)
Ứng dụng Mobile đa nền tảng (iOS, Android) với đầy đủ luồng Khách hàng (đặt dịch vụ 4 bước, so sánh báo giá) và Thợ (nhận việc, gửi báo giá, cập nhật tiến độ):

```bash
cd fe/mobile
npm start     # Khởi động Expo Metro Bundler
```
Hoặc từ thư mục `fe/`:
```bash
npm run mobile          # Chạy Expo
npm run mobile:android  # Chạy trên Android Emulator / Thiết bị
npm run mobile:ios      # Chạy trên iOS Simulator
```
