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
docker-compose up --build
```

Đợi tất cả container khởi động (lần đầu build có thể mất vài phút), sau đó seed dữ liệu mẫu:

```bash
docker-compose exec user-service node seed.js
docker-compose exec fee-service node seed.js
```

Truy cập:
- Frontend: http://localhost
- API Gateway: http://localhost:8080/api
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

## 7. Cách test 2 tình huống concurrency (mục 6 rubric)

**Tình huống A — 2 giao dịch cùng lúc trên 1 tài khoản:**
```bash
# Chạy song song 2 request cùng lúc bằng curl (hoặc dùng Postman Runner)
curl -X POST http://localhost:8080/api/transactions \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"payerId":"<userId>","mssv":"52100013","amount":4000000,"payerEmail":"a@x.com"}' &
curl -X POST http://localhost:8080/api/transactions \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"payerId":"<userId>","mssv":"52100027","amount":4000000,"payerEmail":"a@x.com"}' &
wait
```
Kỳ vọng: chỉ 1 request thành công (201), request còn lại nhận `402`/`409` vì số dư không đủ.

**Tình huống B — 2 tài khoản cùng thanh toán 1 MSSV:**
Lặp lại tương tự nhưng dùng 2 `payerId` khác nhau, cùng 1 `mssv`. Kỳ vọng: chỉ 1 request được `reserve` thành công, request còn lại nhận `409 Conflict` ngay từ bước đầu (không bị trừ tiền).

## 8. Cấu trúc thư mục

```
tuition-ibanking/
├── docker-compose.yml
├── api-gateway/       # điểm vào duy nhất, xác thực JWT, proxy request
├── user-service/       # tài khoản, số dư (atomic deduct/refund)
├── fee-service/        # học phí (atomic reserve/confirm/release)
├── payment-service/    # Saga orchestrator - điều phối toàn bộ giao dịch
├── otp-service/         # sinh/xác thực OTP, publish message gửi email
├── frontend/            # React + Vite + Tailwind
└── docs/diagrams/       # 6 file .mermaid: usecase, erd, microservices,
                          # state diagram, 2 sequence diagram
```

## 9. Trạng thái giao dịch (state machine)

```
pending -> otp_sent -> success
                     -> failed   (OTP sai/hết số lần thử)
                     -> expired  (OTP hết hạn 5 phút)
pending -> failed    (không đủ số dư hoặc học phí đã có người thanh toán)
```

Xem chi tiết tại `docs/diagrams/transaction_state_diagram.mermaid`.
