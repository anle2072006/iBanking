# TDTU Pay — Phân hệ đóng học phí của ứng dụng iBanking

Đồ án giữa kỳ CS504070 - kiến trúc Microservices, hiện thực bằng Node.js/Express + MongoDB + RabbitMQ.

## 1. Kiến trúc hệ thống

```
Frontend (React) --> API Gateway --> User Service    (MongoDB riêng)
                                  --> Fee Service     (MongoDB riêng)
                                  --> Payment Service (MongoDB riêng, orchestrator)
                                                       --> OTP Service (MongoDB riêng)
                                                             --> RabbitMQ --> gửi email (Nodemailer)
```

Xem chi tiết 6 diagram thiết kế trong `docs/diagrams/` (Use Case, ERD, Microservices Architecture, State Diagram, 2 Sequence Diagram cho tình huống concurrency).

## 2. Yêu cầu hệ thống

- Docker & Docker Compose (khuyến nghị — không cần cài gì thêm)
- Hoặc chạy tay: Node.js >= 18, MongoDB, RabbitMQ cài sẵn trên máy

## 3. Cách chạy — Docker (khuyến nghị)

```bash
# Lần đầu: tạo file .env cho từng service từ file mẫu (.env không được commit lên git)
for s in api-gateway user-service fee-service payment-service otp-service; do cp $s/.env.example $s/.env; done

docker-compose up --build
```

Compose có healthcheck và `depends_on: condition: service_healthy` nên các service tự chờ MongoDB/RabbitMQ sẵn sàng.
Đợi tất cả container khởi động (lần đầu build có thể mất vài phút), sau đó seed dữ liệu mẫu:

```bash
docker-compose exec user-service node seed.js
docker-compose exec fee-service node seed.js
```

Truy cập:
- Frontend: http://localhost
- API Gateway: http://localhost:8080/api (kiểm tra sống: http://localhost:8080/health)
- RabbitMQ dashboard: http://localhost:15672 (guest/guest)

## 4. Cách chạy — thủ công từng service (không dùng Docker)

Cần cài sẵn MongoDB (`localhost:27017`) và RabbitMQ (`localhost:5672`) trên máy.
Với mỗi service, đổi `MONGO_URI`/`RABBITMQ_URL` trong `.env` thành `localhost` thay vì tên container.

```bash
# Terminal 1
cd user-service && npm install && npm run dev

# Terminal 2
cd fee-service && npm install && npm run dev

# Terminal 3
cd otp-service && npm install && npm run dev

# Terminal 4
cd payment-service && npm install && npm run dev

# Terminal 5
cd api-gateway && npm install && npm run dev

# Terminal 6
cd frontend && npm install && npm run dev
```

Seed dữ liệu:
```bash
cd user-service && node seed.js
cd fee-service && node seed.js
```

## 5. Tài khoản demo

| Username | Password | MSSV liên kết |
|---|---|---|
| sv001 | 123456 | 52100013 |
| sv002 | 123456 | 52100027 |

## 6. Lưu ý về gửi email OTP

Mặc định `otp-service/.env` dùng thông tin SMTP giả (`your_email@gmail.com`). Để gửi email thật:
1. Dùng Gmail: bật "App Password" tại https://myaccount.google.com/apppasswords
2. Cập nhật `SMTP_USER`, `SMTP_PASS` trong `otp-service/.env`
3. Chạy lại `docker-compose up --build otp-service`

Nếu không cấu hình SMTP, hệ thống vẫn tạo OTP bình thường (lưu trong DB) — chỉ bước gửi email sẽ log lỗi ra console, không ảnh hưởng logic transaction/concurrency.

## 7. Cách test

### 7.1. Test tự động (không cần Docker, không cần cài thêm thư viện)

Dùng test runner có sẵn của Node.js (>= 18). Chạy trong từng service:

```bash
cd payment-service && npm test   # luồng thanh toán, tình huống A/B, hoàn tác, dọn giao dịch quá hạn
cd user-service && npm test      # validation, trừ/hoàn tiền atomic
cd fee-service && npm test       # validation, reserve/confirm/release atomic
cd otp-service && npm test       # validation, OTP đúng/sai/hết hạn, giới hạn số lần thử
cd api-gateway && npm test       # chặn route nội bộ, chỉ xem được dữ liệu của chính mình
```

Các test concurrency ở đây chạy trên bản mô phỏng các thao tác atomic của MongoDB.
Để test trên hệ thống thật, dùng script ở mục 7.2.

### 7.2. Test trên hệ thống đang chạy (qua API Gateway)

Script `scripts/concurrency-test.js` (Node >= 18, không cần cài gì):

```bash
node scripts/concurrency-test.js security   # route nội bộ bị chặn, xem dữ liệu người khác, token giả (không đổi dữ liệu)

# Tình huống A và B làm thay đổi dữ liệu -> seed lại trước MỖI lần chạy
docker-compose exec user-service node seed.js && docker-compose exec fee-service node seed.js
node scripts/concurrency-test.js a    # 1 tài khoản, 2 giao dịch đồng thời

docker-compose exec user-service node seed.js && docker-compose exec fee-service node seed.js
node scripts/concurrency-test.js b    # 2 tài khoản cùng nộp học phí MSSV 52100013
```

**Tình huống A — 2 giao dịch cùng lúc trên 1 tài khoản.** Kỳ vọng: chỉ 1 request thành công (`201`),
request còn lại nhận `402` vì số dư không đủ; số dư không bao giờ âm.

**Tình huống B — 2 tài khoản cùng thanh toán 1 MSSV.** Kỳ vọng: chỉ 1 request được `reserve` thành công,
request còn lại nhận `409 Conflict` ngay từ bước đầu (không bị trừ tiền).

Thử bằng tay: client chỉ gửi `mssv`; người nộp lấy từ JWT, số tiền và email do server tự xác định
(không còn gửi `payerId`, `amount`, `payerEmail`):

```bash
curl -X POST http://localhost:8080/api/transactions \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"mssv":"52100013"}'
```

### 7.3. Tài liệu API

- OpenAPI 3: `docs/openapi.yaml` (mở bằng https://editor.swagger.io)
- Postman: `docs/postman/tdtu-pay.postman_collection.json` (chạy "Login sv001" trước, token được lưu tự động)

Các route công khai qua gateway: `POST /auth/login`, `GET /users/:id` (chỉ của chính mình),
`GET /fees/:mssv`, `POST /transactions`, `POST /transactions/:id/verify-otp`, `GET /transactions/user/:userId`
(chỉ của chính mình). Các route nội bộ (`/users/:id/deduct`, `/users/:id/refund`, `/fees/:mssv/reserve|confirm|release`)
không đi qua gateway, gọi vào sẽ nhận 404.

## 8. Cấu trúc thư mục

```
tuition-ibanking/
├── docker-compose.yml
├── api-gateway/       # điểm vào duy nhất, xác thực JWT, chặn route nội bộ, proxy request
├── user-service/       # tài khoản, số dư (atomic deduct/refund)
├── fee-service/        # học phí (atomic reserve/confirm/release)
├── payment-service/    # Saga orchestrator - điều phối toàn bộ giao dịch
├── otp-service/         # sinh/xác thực OTP, publish message gửi email
├── frontend/            # React + Vite + Tailwind
├── scripts/             # concurrency-test.js: test A, B và bảo mật trên hệ thống thật
└── docs/
    ├── openapi.yaml
    ├── postman/
    └── diagrams/        # 6 file .mermaid: usecase, erd, microservices,
                          # state diagram, 2 sequence diagram
```

## 9. Trạng thái giao dịch (state machine)

```
pending -> otp_sent -> success
                     -> failed   (nhập sai quá 5 lần, hoặc không xác nhận được học phí)
                     -> expired  (OTP hết hạn 5 phút)
pending -> failed    (gửi OTP lỗi, hoặc service sập quá 2 phút)
```

Giao dịch chỉ được ghi (trạng thái `pending`) sau khi đã giữ chỗ học phí và trừ tiền thành công.
Nếu học phí đã có người thanh toán (`409`) hoặc không đủ số dư (`402`) thì request bị từ chối trước đó
và không tạo giao dịch. Khi giao dịch kết thúc bằng `failed`/`expired`, tiền được hoàn và học phí được nhả.

Xem chi tiết tại `docs/diagrams/transaction_state_diagram.mermaid`.
