# AGENTS.md

## 1. Tổng quan

- Nền tảng đặt dịch vụ gia đình (điện nước, điện lạnh, dọn dẹp, sửa khóa, ...), kết nối **CUSTOMER** với **PROVIDER**; có thêm **STAFF** và **ADMIN**.
- Repo môn học SDN302/SWD392 (Fall 2026, Team 5), gồm 3 ứng dụng độc lập:
  - `be/`: REST API Express + MongoDB.
  - `fe/web/`: Next.js cho customer/provider/staff/admin.
  - `fe/mobile/`: Expo/React Native cho customer/provider.
- Không có CI/CD, Docker, hay `package.json` workspace ở root. Mỗi app cài dependency và chạy riêng.
- Tài liệu as-built tốt nhất hiện có: `docs/PROJECT_OVERVIEW.md` (rất chi tiết). Lưu ý `docs/` đang bị `.gitignore` bỏ qua, nên fresh clone sẽ không có.
- Root `README.md` đã cũ: nói 54 test/9 suite (thực tế 151 test/26 file), và trỏ tới `docs/README.md`, `docs/audit/`, `docs/atlas/` không tồn tại.

## 2. Tech stack (lấy từ manifest)

| Phần | Stack chính |
|---|---|
| Backend | Node.js (hiện chạy Node 22.19; repo không khai báo `engines`), Express `^5.1.0`, CommonJS, Mongoose `^8.18.0`, MongoDB |
| Auth/security | JWT (`jsonwebtoken`), bcryptjs cost 12, Helmet, CORS, express-rate-limit |
| Tích hợp BE | Nodemailer SMTP, Google Auth Library, PayOS, Cloudinary, Multer |
| Web | Next.js `16.4.5` App Router, React `^19`, Tailwind CSS `^4.3.3`, shadcn (`components.json`, style `base-nova`), TypeScript `5.7.3` |
| Mobile | Expo `~57.0.24`, React Native `0.86.3`, React `19.2.3`, React Navigation 7, Zustand 5, AsyncStorage, TypeScript `~6.0.3` |
| Test | Node built-in test runner (`node --test`), không có Jest/Vitest |

## 3. Cấu trúc thư mục

- `be/src/server.js`: entry point; kết nối DB, listen `PORT`, chạy job tự huỷ booking quá hạn mỗi 15 phút.
- `be/src/app.js`: khai báo middleware (helmet, CORS, JSON 2MB, morgan), mount `/api`, error handler.
- `be/src/routes/index.js`: mount toàn bộ router con; thứ tự route ở đây rất quan trọng.
- `be/src/modules/<domain>/`: mỗi domain thường có `*.routes.js`, `*.controller.js`, `*.model.js`, `*.validation.js`, có thể có `*.service.js`/`*.middleware.js`.
- `be/src/middlewares/`: `protect`/`authorize` (JWT + role) và `notFound`/`errorHandler`.
- `be/src/shared/`: `AppError`, `handleAppError`, `baseOptions` cho Mongoose, validator dùng chung.
- `be/src/config/`: `env.js` (đọc `.env`), `db.js`, `cloudinary.js`.
- `be/src/seed/`: seed demo; `seed.js` gọi `full.seed.js`. `be/scripts/migrate-*.js`: migration một lần, mặc định dry-run.
- `be/test/`: test Node built-in; `be/test-helpers/dispatch.js` dispatch request qua `app.handle` không mở socket.
- `fe/web/app/`: Next App Router. `page.tsx` và `web/page.tsx` cùng render `WebAppShell`; `admin/*` và `provider/*` là các route riêng.
- `fe/web/components/`: UI theo domain (`customer`, `provider-*`, `admin-*`, `auth`, `web`, `ui`); `components/app-store.tsx` là state client lớn của shell `/`.
- `fe/web/lib/api/`: wrapper gọi API; `lib/auth.ts` là auth client riêng; `hooks/` chứa hook theo màn.
- `fe/mobile/App.tsx` → `src/navigation/RootNavigator.tsx` (stack + bottom tabs).
- `fe/mobile/src/screens/{auth,common,customer,provider}/`: màn hình; `src/services/` và `src/api/` là tầng gọi API; `src/store/` là Zustand.
- `docs/`: tài liệu, sơ đồ ERD/deployment, báo cáo; chỉ có local vì bị ignore.

## 4. Kiến trúc & luồng dữ liệu

- Cả web và mobile gọi REST JSON tới backend, prefix `/api`, auth bằng `Authorization: Bearer <JWT>`.
- Response thường có dạng `{ success, message?, data?, pagination? }`; lỗi có `success: false` kèm `errors` (validation) hoặc `details` (AppError).
- Backend là **modular monolith / layered**: route → auth/role → validation → controller → model/service.
- JWT chứa `sub` (user id) và `role`; `protect` luôn load lại user và yêu cầu `status === "ACTIVE"`. Không có refresh token.
- Luồng đăng ký: `POST /api/auth/register` trả `202`, tạo user `INACTIVE` + `emailVerified: false`, gửi mã 6 số TTL 15 phút; `POST /api/auth/verify-email` kích hoạt và trả `accessToken`.
- Luồng booking: tạo `ServiceRequest` (OPEN) → `select-provider` tạo `Booking` (PENDING_CONFIRMATION) và request chuyển BOOKED → provider confirm/decline qua endpoint riêng → cập nhật tiến độ → COMPLETED.
- Trạng thái booking hợp lệ nằm trong `be/src/modules/bookings/booking.status.js`; `CONFIRMED → COMPLETED` bị chặn, và `COMPLETED` bắt buộc `confirmCompletion: true`. `finalPrice` chỉ được gửi khi COMPLETED.
- Provider matching là logic tính điểm xác định (kỹ năng, khoảng cách, lịch rảnh, rating Bayesian, ngân sách), **không phải AI**.
- `ServiceRequest.aiAnalysis` chỉ là schema/seed/UI mock; repo không có AI service/LLM.
- Chat chỉ là state phía client; không có API/backend real-time.
- Payment chỉ có membership provider qua PayOS; không có checkout thanh toán booking cho customer.
- Web có 2 shell song song: `/` (và `/web`) dùng `WebAppShell` + `app-store` với role switch/demo state; `/admin/*` dùng `WorkspaceShell` + JWT thật. Nhiều route `/provider/*` redirect về `/`; `/admin/users*` redirect về `/?adminTab=users`; chỉ một số trang admin/provider là thật.
- Web dev proxy: `next.config.mjs` rewrite `/api/:path*` sang `BACKEND_URL || http://localhost:5173`. Tuy nhiên nhiều file cũ vẫn gọi trực tiếp `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_API_BASE_URL` (fallback `http://localhost:5173/api`).
- Mobile base URL: ở production (`!__DEV__`), `EXPO_PUBLIC_API_URL` bắt buộc khai báo, parse bằng `new URL()`, yêu cầu giao thức `https:`, hostname hợp lệ và từ chối localhost/127.0.0.1/10.0.2.2/IP private (V-20). Ở dev (`__DEV__`), nếu không có biến thì Android emulator fallback `10.0.2.2:5173/api`, còn lại `localhost:5173/api`.

## 5. Lệnh quan trọng

```bash
# Backend (chạy trong be/)
npm install
# Tạo be/.env từ be/.env.example; MONGO_URI và JWT_SECRET là bắt buộc
npm run seed          # seed demo đầy đủ (upsert, cần DB dev)
npm run dev           # http://localhost:5173
npm start

# Web (chạy trong fe/web/)
npm install           # repo cũng có pnpm-lock; README dùng npm
npm run dev           # http://localhost:3000
npm run build
npm run typecheck
npm start

# Mobile (chạy trong fe/mobile/)
npm install
npm start             # Expo Metro
npm run android | ios | web
npm test              # unit test V-20 (yêu cầu Node >= 22.6)
npm run typecheck
```

- Test toàn bộ backend: `cd be && npm test` — hiện có **151 test / 26 file**, chạy ~22 giây, không kết nối DB thật (Mongoose được stub).
- Test một file: `cd be && node --test test/booking.lifecycle.test.js`.
- Test theo tên: `cd be && node --test --test-name-pattern="confirmBooking" test/booking.lifecycle.test.js`.
- Test route ordering sau khi sửa route provider: `cd be && node --test test/route-shadowing.test.js`.
- Web đã bỏ `typescript.ignoreBuildErrors: true` trong `next.config.mjs`, kiểm tra kiểu bằng `cd fe/web && npm run typecheck` (hoặc `npx tsc --noEmit`); `next build` giờ sẽ fail nếu có lỗi kiểu. Web vẫn chưa có ESLint/Prettier.
- Mobile typecheck & test: `cd fe/mobile && npm test && npm run typecheck` (đã pass tại thời điểm viết).
- Migration: `node be/scripts/migrate-*.js` mặc định dry-run; chỉ thêm `--apply` khi đã chắc chắn là DB dev.
- Root `fe/` chỉ có script tiện dụng (`npm run web`, `npm run mobile`, ...); root repo không có workspace/install chung.

## 6. Quy ước code

- Backend dùng CommonJS (`require`/`module.exports`), file `.js`; đặt tên theo domain: `<domain>.routes.js`, `<domain>.controller.js`, `<domain>.model.js`, `<domain>.validation.js`, `<domain>.service.js`.
- Route mới nên theo chuỗi middleware hiện có: `protect` → `authorize(...roles)` → validator → controller; cuối router dùng `router.use(handleAppError)`.
- Validator trả `{ data, errors }`, whitelist field và chuẩn hoá dữ liệu (email lowercase, phone VN, trim). Không truyền thẳng `req.body` vào model.
- Dùng `AppError(statusCode, message, details?)` cho lỗi nghiệp vụ; lỗi validation trả `errors: [{ field, message }]`.
- Mongoose dùng `baseOptions` trong `be/src/shared/schema-options.js`: `timestamps`, bỏ `versionKey`, `strict: "throw"`, `minimize: false`. Model PascalCase, field camelCase, collection mặc định plural lowercase.
- `ProviderProfile` canonical là `be/src/modules/providers/provider.model.js`. `provider-verification/providerProfile.model.js` chỉ re-export; **không tạo schema ProviderProfile thứ hai** (đã từng gây lỗi BUG-15).
- Role phía backend viết HOA (`CUSTOMER`, `PROVIDER`, `STAFF`, `ADMIN`); client thường map sang chữ thường.
- Web: App Router, component stateful cần `'use client'`, alias `@/*`, dùng `cn()` từ `lib/utils`; UI primitives/shadcn nằm ở `components/ui`. API theo domain đặt trong `lib/api/`.
- Mobile: màn hình mỏng, gọi API qua `services/` (dùng `services/apiClient.ts`); style lấy từ `constants/colors.ts`, `spacing.ts`, `typography.ts`; dùng `components/ui` thay vì hard-code màu/kích thước.
- UI copy chủ yếu tiếng Việt; identifier/code dùng tiếng Anh.
- Không có Prettier/ESLint cấu hình. Giữ style của file hiện tại; không mass-format hay đổi dấu nháy toàn repo.

## 7. Biến môi trường

Không commit `.env`, `.env.local`, hay bất kỳ credential nào. Chỉ ghi tên biến, không ghi giá trị.

- Backend (`be/.env`, đọc bởi `be/src/config/env.js`):
  - Bắt buộc: `MONGO_URI`, `JWT_SECRET`.
  - Cơ bản: `NODE_ENV`, `PORT`, `JWT_EXPIRES_IN`, `CLIENT_URL` (danh sách origin CORS, phân tách bằng dấu phẩy; dev tự cho phép mọi `localhost`).
  - Seed (chỉ dev/test): `SEED_PASSWORD`, `SEED_ADMIN_PASSWORD`; thiếu biến nào thì seed sinh mật khẩu ngẫu nhiên cho biến đó.
  - Google: `GOOGLE_CLIENT_IDS` (comma-separated Android/iOS/Web client IDs).
  - Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
  - Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_URL`.
  - PayOS: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYOS_RETURN_URL`, `PAYOS_CANCEL_URL`.
  - Bảo mật & proxy (V-16): `TRUST_PROXY` (hỗ trợ boolean `true`/`false`, số hop `1`, `2`, hoặc IP/subnet/preset như `'loopback'`; dev/test mặc định `false` tránh giả mạo IP, production mặc định `1` phù hợp reverse proxy 1-hop như Render/Railway/Nginx; môi trường đa tầng proxy cần xác minh kiến trúc deploy cụ thể).
  - Rate limiting (V-10): `RATE_LIMIT_GLOBAL_WINDOW_MS`, `RATE_LIMIT_GLOBAL_MAX`, `RATE_LIMIT_UPLOAD_WINDOW_MS`, `RATE_LIMIT_UPLOAD_MAX`, `RATE_LIMIT_AVAILABILITY_WINDOW_MS`, `RATE_LIMIT_AVAILABILITY_MAX`.
  - `VIETMAP_API_KEY` có trong `.env.example` nhưng backend không đọc.
  - Giao dịch & mô phỏng (V-12 / V-27 / V-28):
    - `ALLOW_NO_TRANSACTION` (mặc định `false`): dev/test fallback khi MongoDB standalone không hỗ trợ transaction.
    - `ALLOW_PAYMENT_SIMULATION` (mặc định `false`): bật mô phỏng gói membership (`simulateSuccess` do server quyết định) — chỉ cho phép khi `NODE_ENV` là `development` hoặc `test`.
- Web (`fe/web/.env.local`; **không có `.env.example`** dù `fe/README.md` nói có):
  - `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `NEXT_PUBLIC_VIETMAP_API_KEY`, `NEXT_PUBLIC_VIETMAP_TILE_KEY`, `BACKEND_URL`.
  - Google Web Client ID phải trùng một phần tử trong `GOOGLE_CLIENT_IDS` của backend.
- Mobile (`fe/mobile/.env`, mẫu có `.env.example`):
  - `EXPO_PUBLIC_API_URL` (bắt buộc `https://` ở production; dev tùy chọn có fallback), `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_VIETMAP_API_KEY`.
- Biến có prefix `NEXT_PUBLIC_`/`EXPO_PUBLIC_` bị nhúng vào client; không dùng chúng cho secret hoặc token tĩnh (biến `NEXT_PUBLIC_API_TOKEN` cũ đã bị loại bỏ hoàn toàn); mọi API cần xác thực phải dùng JWT người dùng từ phiên đăng nhập.

## 8. Lưu ý / cạm bẫy

- **Thứ tự route**: trong `be/src/routes/index.js`, router `/providers` (static `/search`, `/requests/incoming`) phải đứng trước review routes và wildcard `/providers/:providerId`. Thêm route provider mới sai thứ tự sẽ bị wildcard nuốt; luôn chạy `route-shadowing.test.js`.
- Có nhiều alias/verb trùng: `/api/requests` = `/api/service-requests`; một số endpoint booking nhận cả PATCH và POST (`confirm`, `decline`, `reschedule`, `cancel`); report có `/api/reports` và `/api/admin/reports`. Đừng xoá alias khi chưa kiểm tra client.
- Web auth có 2 base URL khác nhau: `lib/api/client.ts` mặc định `/api` (đi qua proxy), còn `lib/auth.ts` mặc định `http://localhost:5173/api` (gọi trực tiếp). Đặt `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_API_BASE_URL` nhất quán, nếu không sẽ gặp CORS hoặc lỗi "không kết nối được API" ở một số màn.
- `.env.example` backend đang thiếu nhiều biến mà `env.js` đọc (`GOOGLE_CLIENT_IDS`, SMTP, Cloudinary); `CLIENT_URL` mẫu là cổng 8080 trong khi web chạy 3000. Dev vẫn qua được vì CORS cho phép mọi localhost, nhưng đừng copy nguyên làm production.
- **Auto-login demo chỉ tồn tại ở dev**: `ensureCustomerToken()` trong `lib/api/client.ts` chỉ chạy nhánh demo khi `process.env.NODE_ENV !== 'production'`; trong `services/apiClient.ts` chỉ chạy khi `__DEV__`. Ở production hàm ném lỗi tiếng Việt "Vui lòng đăng nhập để tiếp tục." Các luồng gọi API phải có JWT thật; không thêm fallback auto-login mới. `WorkspaceShell` và `LoginScreen` chỉ hiển thị gợi ý demo ở dev và **không bao giờ hiển thị mật khẩu** trên UI.
- **Mobile production HTTPS bắt buộc (V-20)**: Bản build production (`!__DEV__`) của mobile cấm tuyệt đối HTTP cleartext fallback. `EXPO_PUBLIC_API_URL` bắt buộc có, phải parse thành công bằng `new URL()`, yêu cầu giao thức `https:`, từ chối `localhost`/`127.0.0.1`/`10.0.2.2` và toàn bộ dải IP private (RFC 1918); nếu sai sẽ ném lỗi cấu hình ngay khi khởi động (`apiClient.ts`). Cấu hình EAS Build profile `production` trong `fe/mobile/eas.json` và Expo `app.json` không bật `usesCleartextTraffic`.
- Seed `full.seed.js` **không còn mật khẩu cố định**: đọc `SEED_PASSWORD` (tài khoản `*.demo@homecare.local`) và `SEED_ADMIN_PASSWORD` (`admin@homecare.local`), thiếu thì sinh ngẫu nhiên và chỉ in mật khẩu vừa sinh (không in mật khẩu lấy từ env). Seed từ chối chạy khi `NODE_ENV=production`. Các seed cũ `catalog.seed.js`, `booking-demo.seed.js`, `incoming-requests.seed.js` vẫn còn `Demo123!` hard-code — chỉ chạy ở DB dev/test.
- `be/scripts/migrate-disable-demo-accounts.js` mặc định dry-run; `--apply` chỉ set `status=INACTIVE` cho `*.demo@homecare.local`, **không xoá tài khoản**. Không chạy `--apply` khi chưa xác nhận đúng DB.
- DB cũ có thể còn index `phone_1` non-sparse; schema hiện dùng partial unique index. Trước khi deploy schema mới, drop index cũ một lần (`be/README.md`).
- Tạo user mới phải set rõ `emailVerified: false` và `status: "INACTIVE"` như `auth.routes.js`; schema có default `emailVerified: true`, không dựa vào default.
- `strict: "throw"` của Mongoose sẽ ném lỗi nếu ghi field không có trong schema. Khi thêm field, cập nhật đồng bộ model + validator + DTO/serialize + seed.
- Job auto-expire booking là `setInterval` trong từng process API; chạy nhiều replica có thể chạy trùng. Chưa có queue/distributed lock.
- Cloudinary không cấu hình thì upload trả data URL base64 (không bền vững). Upload giới hạn 5 file, 5MB/file.
- Web build không còn bỏ qua lỗi TypeScript (đã xóa `typescript.ignoreBuildErrors: true`); `next build` và `npm test              # unit test (yêu cầu Node >= 22.6)
npm run typecheck` đều kiểm tra kiểu thật sự. Repo chưa có lint/CI để bắt lỗi hộ.
- `docs/` và `*.md` nằm trong `.gitignore` (dòng `docs/`, `*.md`). `AGENTS.md` mới sẽ không được track mặc định; nếu cần commit, dùng `git add -f AGENTS.md` hoặc thêm exception `!AGENTS.md` (cân nhắc trước khi sửa `.gitignore`).
- `package-lock.json` cũng bị ignore; root `package-lock.json` chỉ là stub rỗng, không phải workspace thật.

## 9. Quy tắc cho agent

- Trước khi kết thúc, chạy verification tương ứng:
  - Backend: `cd be && npm test` (hoặc ít nhất file test liên quan).
  - Web: `cd fe/web && npm run typecheck` (hoặc `npx tsc --noEmit`).
  - Mobile: `cd fe/mobile && npm test && npm run typecheck`.
- Khi sửa API/route/status flow, thêm hoặc cập nhật test trong `be/test/`; ưu tiên test hành vi qua `dispatch(app, ...)` thay vì chỉ test hàm thuần.
- Khi sửa route provider, chạy thêm `node --test test/route-shadowing.test.js`.
- Không chạy `npm run seed`, `migrate-* --apply`, hay script reset lên database production/chưa xác nhận. Không đọc/in giá trị `.env` hoặc credential.
- Không tạo model/schema `ProviderProfile` thứ hai; dùng canonical `providers/provider.model.js`.
- Không sửa `node_modules/`, `.next/`, `tsconfig.tsbuildinfo`, hay file generated; không commit chúng.
- Giữ thay đổi nhỏ và đúng domain; tránh refactor toàn bộ `components/app-store.tsx` hoặc mass-format khi chỉ cần sửa một màn.
- Nếu tài liệu mâu thuẫn với code, ưu tiên `package.json`, route/model/controller và test; ghi rõ "chưa xác định" thay vì đoán.

## 10. Nguyên tắc làm việc của AI Agent (Karpathy Guidelines)

Áp dụng các nguyên tắc dưới đây cho mọi yêu cầu phân tích, sửa lỗi, bổ sung tính năng và review code. Ưu tiên tính đúng đắn, sự đơn giản và khả năng kiểm chứng; không làm theo máy móc với tác vụ rất nhỏ.

### 10.1. Think Before Coding — Suy nghĩ trước khi viết code

- Trước khi sửa, đọc các file liên quan và lần theo luồng hiện tại: route → middleware → validation → controller → service/model; hoặc page/screen → component → hook/store → API service.
- Xác định rõ yêu cầu, hành vi hiện tại, hành vi mong muốn và tiêu chí hoàn thành có thể kiểm chứng.
- Nêu rõ giả định nếu yêu cầu còn thiếu. Nếu có nhiều cách hiểu làm thay đổi kết quả, hỏi lại thay vì tự chọn một cách hiểu quan trọng.
- Không tự suy diễn business rule, quyền truy cập, trạng thái booking, chính sách giá, quy trình thanh toán hoặc hành vi UI chưa được xác nhận trong code/tài liệu.
- Nếu phát hiện cách tiếp cận đơn giản hơn hoặc yêu cầu có thể gây lỗi kiến trúc/bảo mật, giải thích ngắn gọn và đề xuất trước khi triển khai.
- Khi chưa đủ thông tin để sửa an toàn, dừng ở bước phân tích và nêu chính xác thông tin còn thiếu.

### 10.2. Simplicity First — Ưu tiên giải pháp đơn giản

- Viết lượng code tối thiểu để đáp ứng đúng yêu cầu; ưu tiên tận dụng module, middleware, component, hook, service và helper hiện có.
- Không thêm abstraction, helper, config, dependency, package hoặc layer mới nếu chưa có nhu cầu thực tế.
- Không xây dựng tính năng dự phòng, khả năng mở rộng hoặc cấu hình linh hoạt mà người dùng chưa yêu cầu và kiến trúc hiện tại chưa cần.
- Không xử lý những tình huống giả định không có căn cứ; tuy nhiên vẫn phải xử lý đầy đủ các lỗi đầu vào, quyền truy cập, trạng thái và lỗi vận hành có thể xảy ra theo hợp đồng hiện tại.
- Không nhân bản logic hoặc tạo model/schema trùng lặp. Đặc biệt, `ProviderProfile` phải tiếp tục dùng model canonical tại `be/src/modules/providers/provider.model.js`.
- Không thêm thư viện mới nếu Node.js, Express, Mongoose, Next.js, React Native hoặc tiện ích sẵn có đã giải quyết được yêu cầu.

### 10.3. Surgical Changes — Chỉ sửa đúng phạm vi

- Chỉ chỉnh sửa các file và đoạn code cần thiết để hoàn thành yêu cầu.
- Không tiện tay refactor, đổi tên, đổi format, đổi dấu nháy, sắp xếp import hoặc viết lại comment ở khu vực không liên quan.
- Giữ nguyên coding style và cấu trúc của file đang sửa; không mass-format toàn repo.
- Không thay đổi API contract, response shape, route alias, HTTP method, role, enum/status hoặc hành vi tương thích ngược nếu yêu cầu không đề cập.
- Khi sửa một luồng dùng chung, kiểm tra các consumer liên quan trước khi thay đổi để tránh làm hỏng Web/Mobile hoặc các role khác.
- Chỉ xóa code/import/file thực sự trở thành dư thừa do chính thay đổi hiện tại tạo ra; không tự ý dọn dẹp phần cũ ngoài phạm vi.
- Không sửa `node_modules/`, `.next/`, file build/cache hoặc file generated.

### 10.4. Goal-Driven Execution — Làm việc theo mục tiêu và kiểm chứng

- Chia yêu cầu nhiều bước thành các phần nhỏ; mỗi phần cần có kết quả mong đợi và cách xác minh.
- Với bug có thể tái hiện, ưu tiên tạo hoặc cập nhật test thể hiện lỗi trước khi sửa; sau đó xác nhận test pass sau khi sửa.
- Với thay đổi backend, kiểm tra cả validation, authentication/authorization, response/error contract và tác động tới dữ liệu.
- Với thay đổi UI, kiểm tra trạng thái loading, empty, error, success và quyền theo role khi chúng thuộc phạm vi yêu cầu.
- Chạy đúng lệnh kiểm thử/typecheck theo khu vực đã thay đổi như quy định tại mục 5 và mục 9; không tuyên bố đã kiểm thử nếu chưa thực sự chạy.
- Nếu không thể chạy test do thiếu môi trường, database, biến môi trường hoặc dependency, nêu rõ giới hạn và những gì đã kiểm tra thay thế.
- Kết thúc bằng báo cáo ngắn: đã thay đổi gì, file chính nào bị ảnh hưởng, lệnh kiểm chứng đã chạy và kết quả; ghi rõ phần chưa xác minh.

### 10.5. Quy trình bắt buộc trước khi sửa

1. **Understand:** đọc yêu cầu và các file liên quan; kiểm tra quy tắc trong tài liệu này.
2. **Trace:** lần theo luồng thực thi và xác định nguồn dữ liệu/hành vi thực tế; không kết luận chỉ từ tên file hoặc comment.
3. **Plan:** nêu ngắn gọn nguyên nhân/giả định, phạm vi file dự kiến sửa và tiêu chí hoàn thành. Với tác vụ nhỏ, có thể thực hiện bước này nội bộ và không cần trình bày dài.
4. **Change:** triển khai thay đổi nhỏ nhất có thể, giữ tương thích với kiến trúc và convention hiện tại.
5. **Verify:** chạy test/typecheck phù hợp; kiểm tra diff để phát hiện thay đổi ngoài ý muốn.
6. **Report:** báo cáo trung thực kết quả, rủi ro còn lại và các bước chưa thực hiện.

### 10.6. Những điều agent tuyệt đối không được tự ý làm

- Không đọc, in, sao chép hoặc đưa giá trị secret/credential trong `.env`, token, API key hay thông tin xác thực vào câu trả lời.
- Không chạy seed, migration có `--apply`, reset hoặc thao tác phá hủy dữ liệu khi chưa xác nhận rõ đây là database dev/test phù hợp.
- Không tự ý thay đổi business logic, quyền role, trạng thái booking, chính sách bảo mật hoặc luồng thanh toán chỉ để làm test pass.
- Không bỏ, làm yếu hoặc xóa test chỉ vì test đang fail; phải tìm nguyên nhân và sửa hành vi đúng theo yêu cầu.
- Không giả lập kết quả kiểm thử, không nói “đã fix hoàn toàn” khi chưa có bằng chứng kiểm chứng tương ứng.
- Không mở rộng phạm vi công việc bằng cách tự thêm tính năng hoặc refactor không được yêu cầu.

**Thứ tự ưu tiên khi có xung đột:** yêu cầu cụ thể của người dùng và tính an toàn dữ liệu/bảo mật → hành vi thực tế trong code và test → quy ước kiến trúc trong tài liệu dự án → các nguyên tắc Karpathy ở mục này. Nếu vẫn chưa thể xác định cách xử lý đúng, hỏi lại thay vì đoán.

## 11. Vận hành & Sao lưu (Backup & Restore) (V-26)

Mục tiêu đảm bảo an toàn dữ liệu, phòng chống thảm họa và phục vụ điều tra sự cố:

### 11.1. Chiến lược sao lưu MongoDB (Backup)
- **Atlas Cloud Backup**: Nếu dùng MongoDB Atlas, bật Continuous Cloud Backups (Point-in-Time Recovery - PITR) và Snapshot Retention tự động (hàng ngày, lưu 7 - 30 ngày).
- **Self-hosted / VPS / Docker**: Chạy cron job định kỳ hàng ngày sử dụng `mongodump` nén gzip:
  ```bash
  # Lệnh tạo bản sao lưu đóng gói archive:
  mongodump --uri="$MONGO_URI" --gzip --archive="/backups/mongodb-$(date +%Y%m%d_%H%M%S).gz"
  ```
- **Lưu trữ an toàn**: Chuyển bản backup sang storage tách biệt (S3, GCS, hoặc backup server độc lập), bật mã hóa at-rest và chính sách vòng đời (retention policy, tự hủy sau 30 ngày). Không lưu bản backup duy nhất trên cùng ổ đĩa với MongoDB instance.

### 11.2. Thử nghiệm phục hồi định kỳ (Restore Drill)
- **Quy tắc vàng**: Một bản backup chưa từng được thử nghiệm restore thì không được coi là backup an toàn.
- **Diễn tập phục hồi**: Định kỳ hàng tháng, kiểm tra phục hồi bản backup mới nhất vào một database test/staging độc lập:
  ```bash
  # Phục hồi vào DB staging (tuyệt đối KHÔNG restore đè lên database production):
  mongorestore --uri="$MONGO_TEST_URI" --gzip --archive="/backups/mongodb-latest.gz" --drop
  ```
- **Kiểm tra tính toàn vẹn sau phục hồi**:
  - Đối chiếu số lượng documents (`countDocuments`) các collection trọng yếu: `users`, `providerprofiles`, `bookings`, `membershippayments`.
  - Kiểm tra các compound index và geospatial 2dsphere index (`indexes:sync`).
  - Chạy smoke test API backend trỏ tới database test để đảm bảo luồng nghiệp vụ đọc/ghi không phát sinh lỗi.

