# Hướng Dẫn Cấu Hình Bảo Mật `TRUST_PROXY` (V-16)

> Tài liệu hướng dẫn cấu hình và vận hành Express `trust proxy` an toàn cho backend Home Service Booking (`be/`), giải quyết triệt để nguy cơ IP spoofing và đảm bảo tính chính xác cho Rate Limiting (V-10) và Logging.

---

## 1. Tổng quan & Vấn đề Bảo mật (V-16)

Trong kiến trúc ứng dụng Web/API hiện đại, Node.js backend thường không nhận kết nối trực tiếp từ người dùng cuối mà chạy đằng sau một hoặc nhiều tầng **Reverse Proxy / Load Balancer** (như Render, Railway, Nginx, Cloudflare, AWS ALB).

### Vấn đề khi KHÔNG cấu hình `trust proxy`
- Theo mặc định của Express, `trust proxy` là `false`. Express chỉ đọc địa chỉ IP từ kết nối TCP socket (`req.socket.remoteAddress`).
- Khi đứng sau reverse proxy, `req.socket.remoteAddress` luôn là **địa chỉ IP của chính proxy** (ví dụ `10.0.0.1` hoặc `127.0.0.1`).
- **Hệ quả nghiêm trọng:**
  1. **Tự DoS (Denial of Service):** Toàn bộ người dùng hợp lệ dùng chung một bucket rate limit. Chỉ cần một người dùng hoặc bot vượt ngưỡng rate limit, toàn bộ hệ thống sẽ bị khóa (HTTP 429).
  2. **Audit Log sai lệch:** Mọi hành động đăng nhập, giao dịch, chỉnh sửa dữ liệu đều ghi nhận IP của proxy, làm mất tính toàn vẹn khi điều tra sự cố bảo mật.

### Nguy cơ khi cấu hình SAI (`trust proxy: true`)
- Một số tài liệu hướng dẫn dùng `app.set('trust proxy', true)`. **ĐÂY LÀ LỖ HỔNG BẢO MẬT NGHIÊM TRỌNG**.
- Khi đặt `true`, Express sẽ coi tất cả các proxy trong chuỗi đều đáng tin và chọn **địa chỉ ngoài cùng bên trái** trong header `X-Forwarded-For`.
- Kẻ tấn công chỉ cần gửi request kèm header:
  ```http
  X-Forwarded-For: 1.2.3.4
  ```
  Express sẽ tin ngay rằng IP của client là `1.2.3.4`. Kẻ tấn công có thể liên tục xoay giá trị IP giả này để **vượt qua mọi hạn mức rate limit** và làm sai lệch nhật ký hệ thống (IP Spoofing).

---

## 2. Cơ chế Hoạt động của Express `trust proxy`

Hệ thống backend sử dụng cơ chế **hop counting** và **IP subnet matching** chuẩn của Express:

1. Khi client kết nối đến reverse proxy đầu tiên (hop ngoài cùng), proxy đó sẽ ghi lại IP thực của client vào header `X-Forwarded-For`.
2. Khi request đến Express, Express duyệt ngược từ socket server:
   - **Hop 0:** Socket connection trực tiếp (`req.socket.remoteAddress` - là IP của reverse proxy liền kề).
   - **Hop 1:** Địa chỉ IP ngoài cùng bên phải trong header `X-Forwarded-For`.
   - **Hop 2, 3...:** Các địa chỉ tiếp theo về phía bên trái.
3. Khi cấu hình `TRUST_PROXY=1`: Express tin cậy đúng 1 hop (hop 0 - proxy liền kề) và lấy địa chỉ hợp lệ do proxy đó chứng thực (hop 1). Cho dù kẻ tấn công có tự chèn `X-Forwarded-For: 1.2.3.4` trước đó, proxy sẽ nối thêm IP thật thành `X-Forwarded-For: 1.2.3.4, <real_ip>`, và Express với `hop = 1` sẽ **chọn chính xác `<real_ip>` và bỏ qua `1.2.3.4`**.

---

## 3. Cấu hình Biến Môi Trường `TRUST_PROXY`

Biến được khai báo trong `be/.env` và đọc thông qua [`be/src/config/env.js`](file:///c:/Users/ASUS/Desktop/SDN302-Team5-Home_Service_Booking/be/src/config/env.js):

```dotenv
# be/.env
TRUST_PROXY=false
```

### Các giá trị được hỗ trợ:
- `false` *(boolean hoặc chuỗi `'false'`)*: Không tin proxy nào; dùng IP socket kết nối trực tiếp.
- `true` *(boolean hoặc chuỗi `'true'`)*: Tin toàn bộ proxy (chỉ dùng nếu proxy ngoài cùng đã lọc/strip hoàn toàn header `X-Forwarded-For`).
- Số hop nguyên (ví dụ `1`, `2`): Số lượng tầng proxy tin cậy tính từ backend lùi lại.
- Chuỗi preset / IP / Subnet (ví dụ `'loopback'`, `'10.0.0.0/8'`, `'loopback, 192.168.1.0/24'`): Chỉ tin cậy các proxy có IP thuộc dải chỉ định.

### Giá trị mặc định (Safe Defaults):
- Môi trường **development** hoặc **test**: Mặc định là `false` để ngăn chặn giả lập IP khi test cục bộ.
- Môi trường **production** (`NODE_ENV=production`): Nếu không khai báo `TRUST_PROXY`, hệ thống tự động gán mặc định an toàn là `1` (phù hợp với kiến trúc cloud PaaS phổ biến như Render/Railway).

---

## 4. Hướng dẫn Cấu hình theo Từng Hạ Tầng Triển Khai

| Hạ tầng triển khai | Giá trị `TRUST_PROXY` | Giải thích kiến trúc & Lưu ý |
|---|---|---|
| **Local Development / Docker đơn lẻ** | `false` | Client kết nối trực tiếp đến port Node.js (`localhost:5173`). Tránh bị giả mạo qua header. |
| **Render** | `1` | Render định tuyến request qua 1 tầng Reverse Proxy trước khi chuyển tới container của ứng dụng. Express tin 1 hop từ Render. |
| **Railway** | `1` | Tương tự Render, Railway sử dụng edge proxy 1-hop chuyển tiếp tới service container. |
| **Nginx chạy chung máy chủ / Docker network** | `loopback` hoặc `1` | Nginx chạy trên localhost (`127.0.0.1`) hoặc trong cùng private network. Đặt `loopback` giúp Express chỉ tin cậy request xuất phát từ loopback IP. |
| **Cloudflare + Render / Railway / Nginx** | `2` *(hoặc `1` nếu Nginx đã rewrite)* | Kiến trúc 2 tầng proxy: `Client -> Cloudflare Edge (hop 2) -> Nginx/Render Proxy (hop 1) -> Express`. Express cần tin 2 hops để lấy IP gốc của người dùng. *(Xem chi tiết mục 5.2).* |
| **AWS ALB / Kubernetes Ingress / GCP Load Balancer** | `1` *(hoặc subnet nội bộ)* | Ingress/ALB đóng vai trò reverse proxy 1-hop. Có thể đặt `1` hoặc cấu hình dải VPC CIDR như `'10.0.0.0/8'`. |

---

## 5. Mẫu Cấu hình Reverse Proxy Tham Khảo

### 5.1. Nginx Reverse Proxy Mẫu (`nginx.conf`)
Khi sử dụng Nginx làm reverse proxy phía trước Express backend:

```nginx
server {
    listen 80;
    server_name api.homeservice.local;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;

        # Truyền thông tin IP và giao thức gốc tới Express
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Hỗ trợ WebSocket (nếu có tính năng real-time trong tương lai)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```
*Với cấu hình trên, trong `be/.env` đặt: `TRUST_PROXY=loopback` hoặc `TRUST_PROXY=1`.*

---

### 5.2. Cloudflare + Nginx Multi-Hop
Khi có Cloudflare đứng trước Nginx:

- **Cách 1: Nginx tự xử lý IP gốc của Cloudflare (Khuyên dùng)**
  Cài đặt module `http_realip_module` trên Nginx và cấu hình dải IP của Cloudflare:
  ```nginx
  # Tin cậy dải IP của Cloudflare
  set_real_ip_from 173.245.48.0/20;
  set_real_ip_from 103.21.244.0/22;
  set_real_ip_from 103.22.200.0/22;
  set_real_ip_from 103.31.4.0/22;
  set_real_ip_from 141.101.64.0/18;
  set_real_ip_from 108.162.192.0/18;
  set_real_ip_from 190.93.240.0/20;
  set_real_ip_from 188.114.96.0/20;
  set_real_ip_from 197.234.240.0/22;
  set_real_ip_from 198.41.128.0/17;
  set_real_ip_from 162.158.0.0/15;
  set_real_ip_from 104.16.0.0/13;
  set_real_ip_from 104.24.0.0/14;
  set_real_ip_from 172.64.0.0/13;
  set_real_ip_from 131.0.72.0/22;

  # Lấy IP gốc từ header do Cloudflare gửi
  real_ip_header CF-Connecting-IP;
  ```
  *Khi Nginx đã khôi phục `$remote_addr` về IP gốc, kết nối từ Nginx tới Express chỉ còn **1 hop**, do đó trong `be/.env` cấu hình `TRUST_PROXY=loopback` hoặc `TRUST_PROXY=1`.*

- **Cách 2: Express xử lý Multi-hop**
  Nếu Nginx chỉ đơn thuần chuyển tiếp `X-Forwarded-For`:
  ```dotenv
  # be/.env
  TRUST_PROXY=2
  ```
  Express sẽ tin qua 2 tầng (Nginx + Cloudflare) để đọc đúng IP client gốc.

---

## 6. Kiểm tra & Giám sát (Testing & Verification)

### 6.1. Chạy Automated Tests
Repo đã có bộ test tự động xác minh toàn diện tại [`be/test/trust-proxy.security.test.js`](file:///c:/Users/ASUS/Desktop/SDN302-Team5-Home_Service_Booking/be/test/trust-proxy.security.test.js):

```bash
cd be
node --test test/trust-proxy.security.test.js
```

Bộ test kiểm tra 9 kịch bản:
1. `parseTrustProxy` parse chính xác booleans, numbers, strings, default an toàn.
2. `trust proxy = 1` nhận diện đúng IP client qua 1 tầng proxy.
3. Chống giả mạo: khi attacker gửi kèm `X-Forwarded-For: 1.2.3.4`, Express chỉ nhận diện IP client hợp lệ do proxy bổ sung.
4. `trust proxy = 2` nhận diện đúng IP qua chuỗi 2 proxy (Cloudflare + Nginx).
5. `trust proxy = "loopback"` nhận diện đúng IP qua proxy nội bộ.
6. `trust proxy = false` từ chối `X-Forwarded-For` và dùng IP socket trực tiếp.
7. Tích hợp Rate Limiting (V-10): Client A bị khóa 429 khi vượt ngưỡng, Client B từ cùng proxy không bị ảnh hưởng.
8. Rate limit khi `trust proxy = false` gom theo IP socket, chặn bypass bằng cách xoay `X-Forwarded-For`.
9. `app.js` khởi tạo Express đồng bộ với `env.trustProxy`.

### 6.2. Kiểm tra Thủ Công với cURL

Sau khi deploy, kiểm tra IP Express nhận diện:

```bash
# Giả lập request đi qua reverse proxy (khi TRUST_PROXY=1)
curl -H "X-Forwarded-For: 203.0.113.195" http://localhost:5173/api/providers/search

# Kiểm tra log server để xác nhận IP ghi nhận là 203.0.113.195, không phải IP proxy.
```

---

## 7. Checklist Triển Khai Production

- [x] Không bao giờ commit file `be/.env` chứa credential thật vào git.
- [x] Không bao giờ thiết lập `TRUST_PROXY=true` trên production.
- [x] Xác định rõ số tầng proxy trong kiến trúc deploy (Render/Railway: `1`; Cloudflare + Nginx: `2` hoặc dùng `CF-Connecting-IP`).
- [x] Kiểm tra log server đảm bảo trường IP client trùng khớp với IP thực của người truy cập.
- [x] Chạy kiểm tra `npm test` trước mỗi lần release production.

