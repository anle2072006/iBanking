# TDTU Pay — Phân hệ đóng học phí của ứng dụng iBanking

Đồ án CS504070. Sinh viên đăng nhập, tra cứu học phí theo MSSV, thanh toán bằng số dư tài khoản,
xác thực bằng mã OTP gửi qua email (hiệu lực 5 phút, dùng một lần), và nhận email xác nhận khi thành công.
Hệ thống xử lý đúng khi nhiều giao dịch xảy ra đồng thời (không trừ tiền hai lần, không thu một khoản học phí hai lần).

**Công nghệ:** Node.js/Express, MongoDB (mỗi service một database), RabbitMQ, React + Vite + Tailwind, Docker Compose.

## 1. Kiến trúc

```
Frontend (React) --> API Gateway --> User Service    (MongoDB riêng): tài khoản, số dư
                                 --> Fee Service      (MongoDB riêng): học phí
                                 --> Payment Service  (MongoDB riêng): điều phối giao dịch (Saga)
                                                         --> OTP Service (MongoDB riêng)
                                                               --> RabbitMQ --> gửi email (Nodemailer)
```

Sơ đồ thiết kế nằm trong `docs/diagrams/` (Use Case, ERD, kiến trúc, trạng thái giao dịch, 2 sequence diagram cho tình huống đồng thời).

## 2. Chuẩn bị

Cần cài: **Docker Desktop** (có Docker Compose) và **Node.js >= 18** (để chạy test và script kiểm tra).

Một tài khoản Gmail để gửi email OTP:
1. Bật xác minh 2 bước cho Gmail.
2. Tạo "Mật khẩu ứng dụng" (App Password) tại https://myaccount.google.com/apppasswords. Đây là chuỗi 16 ký tự, dùng làm `SMTP_PASS`.

## 3. Chạy dự án bằng Docker

### Bước 1. Tạo file `.env` cho từng service

Các file `.env` không được commit lên Git. Tạo từ file mẫu (PowerShell, chạy ở thư mục gốc):

```powershell
foreach ($s in "api-gateway","user-service","fee-service","payment-service","otp-service") { Copy-Item "$s\.env.example" "$s\.env" }
```

Linux/macOS:

```bash
for s in api-gateway user-service fee-service payment-service otp-service; do cp $s/.env.example $s/.env; done
```

### Bước 2. Điền các giá trị bắt buộc

Mở `otp-service/.env` và điền thông tin Gmail dùng để gửi email OTP:

| File | Biến | Giá trị |
|---|---|---|
| `otp-service/.env` | `SMTP_USER` | Gmail dùng để gửi thư |
| `otp-service/.env` | `SMTP_PASS` | App Password 16 ký tự của Gmail đó |

`JWT_SECRET` trong `api-gateway/.env` và `user-service/.env` phải **giống hệt nhau**. Giá trị mẫu có sẵn dùng được khi chạy thử;
khi triển khai thật nên đổi thành chuỗi ngẫu nhiên:

```powershell
[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
```

> Sau khi sửa `.env`, phải tạo lại container thì giá trị mới mới có hiệu lực (xem mục 5).

### Bước 3. Build và chạy

```powershell
docker compose up -d --build
docker compose ps
```

Đợi vài phút lần đầu. Tất cả container phải ở trạng thái `running`/`healthy`.

### Bước 4. Nạp dữ liệu mẫu

`SEED_EMAIL` là email nhận OTP của hai tài khoản demo. Hãy dùng email bạn đọc được:

```powershell
docker compose exec -e SEED_EMAIL=email_cua_ban@gmail.com user-service node seed.js
docker compose exec fee-service node seed.js
```

### Bước 5. Sử dụng

- Giao diện: http://localhost
- API Gateway: http://localhost:8080/api (kiểm tra sống: http://localhost:8080/health)
- RabbitMQ dashboard: http://localhost:15672 (guest/guest)

Chỉ có Gateway (8080) và Frontend (80) mở ra ngoài. Các service bên trong không mở cổng, chỉ gọi được qua Gateway.

## 4. Tài khoản demo

| Username | Mật khẩu | MSSV | Số dư ban đầu | Học phí |
|---|---|---|---|---|
| sv001 | 123456 | 52100013 | 5.000.000 | 5.000.000 |
| sv002 | 123456 | 52100027 | 8.000.000 | 3.000.000 |

**Luồng thử nhanh:** đăng nhập `sv001` → Tra cứu học phí `52100013` → Thanh toán ngay → nhập OTP trong email →
nhận email "Thanh toán học phí thành công". Số dư giảm 5.000.000 và học phí chuyển sang đã thanh toán.

## 5. Các lệnh thường dùng

### Khởi tạo / dừng / xem log

```powershell
# Chạy toàn bộ hệ thống
docker compose up -d --build

# Chạy lại MỘT service sau khi sửa code (ví dụ user-service)
docker compose up -d --build user-service

# Sau khi sửa file .env: tạo lại container để nhận giá trị mới
docker compose up -d --force-recreate otp-service

# Xem log
docker compose logs -f otp-service
docker compose logs --tail 50 payment-service

# Dừng (giữ dữ liệu)
docker compose down
```

### Đưa dữ liệu về trạng thái ban đầu

Seed chỉ đặt lại **tài khoản và học phí**:

```powershell
docker compose exec -e SEED_EMAIL=email_cua_ban@gmail.com user-service node seed.js
docker compose exec fee-service node seed.js
```

Muốn xóa **toàn bộ** dữ liệu (kể cả lịch sử giao dịch và OTP) rồi làm lại từ đầu:

```powershell
docker compose down -v
docker compose up -d --build
docker compose exec -e SEED_EMAIL=email_cua_ban@gmail.com user-service node seed.js
docker compose exec fee-service node seed.js
```

### Khởi tạo từng service riêng

```powershell
# Chỉ chạy user-service (và database của nó)
docker compose up -d --build mongo-user user-service

# Seed riêng từng service
docker compose exec -e SEED_EMAIL=email_cua_ban@gmail.com user-service node seed.js
docker compose exec fee-service node seed.js
```

Tên các service: `user-service`, `fee-service`, `payment-service`, `otp-service`, `api-gateway`, `frontend`,
cùng `mongo-user`, `mongo-fee`, `mongo-payment`, `mongo-otp`, `rabbitmq`.

### Xem dữ liệu bằng MongoDB Compass

| Database | Địa chỉ kết nối |
|---|---|
| user_service_db | `mongodb://localhost:27018` |
| fee_service_db | `mongodb://localhost:27019` |
| payment_service_db | `mongodb://localhost:27020` |
| otp_service_db | `mongodb://localhost:27021` |

## 6. Chạy thủ công từng service (không dùng Docker)

Cần cài MongoDB và RabbitMQ trên máy, và đổi `MONGO_URI`/`RABBITMQ_URL` trong `.env` thành `localhost`
(ví dụ `mongodb://localhost:27017/user_service_db`). Mỗi lệnh chạy ở một terminal riêng:

```powershell
cd user-service;    npm install; npm run dev
cd fee-service;     npm install; npm run dev
cd otp-service;     npm install; npm run dev
cd payment-service; npm install; npm run dev
cd api-gateway;     npm install; npm run dev
cd frontend;        npm install; npm run dev
```

Seed (trong thư mục từng service):

```powershell
$env:SEED_EMAIL="email_cua_ban@gmail.com"; node seed.js   # user-service
node seed.js                                               # fee-service
```

## 7. Kiểm thử

### 7.1. Test tự động (không cần Docker)

```powershell
cd api-gateway;     npm install; npm test; cd ..
cd user-service;    npm install; npm test; cd ..
cd fee-service;     npm install; npm test; cd ..
cd payment-service; npm install; npm test; cd ..
cd otp-service;     npm install; npm test; cd ..
```

Mỗi lần push lên GitHub, CI (`.github/workflows/ci.yml`) tự chạy các test này, xem ở tab **Actions**.

### 7.2. Test trên hệ thống đang chạy (qua API Gateway)

Cần Node.js >= 18. Hệ thống đã chạy và đã seed.

```powershell
node scripts/concurrency-test.js security   # route nội bộ bị chặn, token giả, xem dữ liệu người khác

# Tình huống A và B làm thay đổi dữ liệu: seed lại trước MỖI lần chạy
docker compose exec -e SEED_EMAIL=email_cua_ban@gmail.com user-service node seed.js
docker compose exec fee-service node seed.js
node scripts/concurrency-test.js a    # 1 tài khoản, 2 giao dịch đồng thời

docker compose exec -e SEED_EMAIL=email_cua_ban@gmail.com user-service node seed.js
docker compose exec fee-service node seed.js
node scripts/concurrency-test.js b    # 2 tài khoản cùng nộp học phí MSSV 52100013
```

- **Tình huống A** (2 giao dịch cùng lúc trên 1 tài khoản): chỉ 1 giao dịch thành công (`201`), giao dịch còn lại nhận `402` (không đủ số dư). Số dư không bao giờ âm.
- **Tình huống B** (2 tài khoản cùng thanh toán 1 MSSV): chỉ 1 giao dịch được giữ chỗ học phí, giao dịch còn lại nhận `409`. Học phí chỉ bị trừ một lần.

## 8. Tài liệu API

- OpenAPI 3: `docs/openapi.yaml` (mở bằng https://editor.swagger.io)
- Postman: `docs/postman/tdtu-pay.postman_collection.json` (chạy "Login sv001" trước, token tự lưu)

Các route công khai qua Gateway: `POST /api/auth/login`, `GET /api/users/:id` (chỉ của chính mình),
`GET /api/fees/:mssv`, `POST /api/transactions`, `POST /api/transactions/:id/verify-otp`,
`GET /api/transactions/user/:userId` (chỉ của chính mình). Các route nội bộ (trừ/hoàn tiền, giữ chỗ học phí...)
không đi qua Gateway, gọi vào sẽ nhận 404.

Thử bằng tay (client chỉ gửi `mssv`; người nộp lấy từ token, số tiền do server tự xác định):

```powershell
# 1. Đăng nhập
curl.exe -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"sv001\",\"password\":\"123456\"}"

# 2. Tạo giao dịch (thay <token> bằng token nhận được ở bước 1)
curl.exe -X POST http://localhost:8080/api/transactions -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"mssv\":\"52100013\"}"
```

## 9. Thiết kế giao dịch

```
pending -> otp_sent -> success
                    -> failed   (nhập sai quá 5 lần, hoặc không xác nhận được học phí)
                    -> expired  (OTP hết hạn 5 phút)
pending -> failed   (gửi OTP lỗi, hoặc service sập quá 2 phút)
```

Quy trình khởi tạo: giữ chỗ học phí → ghi giao dịch `pending` → trừ tiền → gửi OTP → `otp_sent`.
Giao dịch được ghi **trước** khi trừ tiền để nếu service sập giữa chừng thì vẫn truy vết và hoàn tiền được.

- **Chống tranh chấp:** trừ tiền và giữ chỗ học phí đều là cập nhật nguyên tử (một lệnh `findOneAndUpdate` có điều kiện).
- **Idempotent:** mỗi tài khoản có sổ `appliedTx`/`refundedTx` theo mã giao dịch, nên gọi lặp không trừ hoặc hoàn hai lần.
- **Hoàn tác (Saga):** khi giao dịch `failed`/`expired`, tiền được hoàn và học phí được nhả. Một job chạy mỗi 30 giây dọn giao dịch quá hạn.
- **OTP:** sinh ngẫu nhiên 6 số, hiệu lực 5 phút, dùng một lần, tối đa 5 lần nhập.
- **Email:** gửi qua RabbitMQ, lỗi thì thử lại tối đa 3 lần.
- **Bảo mật:** Gateway xác thực JWT và chỉ cho phép danh sách route công khai; mật khẩu được băm bằng bcrypt.

**Hạn chế đã biết:** nếu payment-service sập đúng lúc giữa việc giữ chỗ học phí và ghi giao dịch, học phí có thể
kẹt ở trạng thái `dang_xu_ly` (không mất tiền). Khi đó cần seed lại học phí để nhả.

## 10. Xử lý sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| Sửa `.env` nhưng không có tác dụng | Chạy `docker compose up -d --force-recreate <service>` (restart không nạp lại `.env`) |
| Không nhận được email OTP | Kiểm tra `SMTP_USER`/`SMTP_PASS` (App Password) và `SEED_EMAIL`; xem `docker compose logs otp-service`; xem cả thư mục Spam |
| `port is already allocated` ở cổng 8080 hoặc 80 | Có chương trình khác dùng cổng đó. Tắt nó hoặc đổi cổng trong `docker-compose.yml` |
| Học phí hiện "đang xử lý" mãi | Seed lại học phí: `docker compose exec fee-service node seed.js` |
| Sau `git pull` chạy lỗi lạ | `docker compose up -d --build --remove-orphans` |

## 11. Cấu trúc thư mục

```
iBanking/
├── docker-compose.yml
├── api-gateway/       # điểm vào duy nhất: xác thực JWT, chặn route nội bộ, proxy
├── user-service/      # tài khoản, số dư (trừ/hoàn tiền nguyên tử, idempotent)
├── fee-service/       # học phí (reserve/confirm/release nguyên tử)
├── payment-service/   # điều phối giao dịch (Saga), dọn giao dịch quá hạn
├── otp-service/       # sinh/xác thực OTP, gửi email qua RabbitMQ
├── frontend/          # React + Vite + Tailwind
├── scripts/           # concurrency-test.js: kiểm thử A, B và bảo mật trên hệ thống thật
├── .github/workflows/ # CI chạy test tự động
└── docs/              # openapi.yaml, postman/, diagrams/
```

Mỗi service theo mô hình Controller → Service → Repository.