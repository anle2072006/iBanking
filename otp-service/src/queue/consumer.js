const amqp = require("amqplib");
const nodemailer = require("nodemailer");

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const vnd = (n) => Number(n || 0).toLocaleString("vi-VN") + " VND";

async function startConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue("email.send_otp", { durable: true });
  await ch.assertQueue("email.send_confirmation", { durable: true });

  // Hàm dùng chung: gửi mail; lỗi thì thử lại tối đa MAX_RETRIES lần (cách nhau RETRY_DELAY_MS),
  // bỏ mess để ko trả vô hạn
  const handle = (queue, buildMail) =>
    ch.consume(queue, async (msg) => {
      if (!msg) return;
      const data = JSON.parse(msg.content.toString());
      const retries = Number(msg.properties.headers?.["x-retries"] || 0);

      try {
        await transporter.sendMail({
          from: '"TDTU Pay" <no-reply@tdtupay.local>',
          to: data.email,
          ...buildMail(data),
        });
        console.log(`[Consumer:${queue}] Đã gửi email tới ${data.email} (giao dịch ${data.transactionId})`);
      } catch (err) {
        if (retries < MAX_RETRIES) {
          console.error(
            `[Consumer:${queue}] Gửi email lỗi (${err.message}), thử lại lần ${retries + 1}/${MAX_RETRIES} sau ${RETRY_DELAY_MS / 1000}s`
          );
          setTimeout(() => {
            ch.sendToQueue(queue, msg.content, {
              persistent: true,
              headers: { "x-retries": retries + 1 },
            });
          }, RETRY_DELAY_MS);
        } else {
          console.error(
            `[Consumer:${queue}] BỎ message của giao dịch ${data.transactionId} sau ${MAX_RETRIES} lần thử: ${err.message}`
          );
        }
      } finally {
    //luon ack
        ch.ack(msg);
      }
    });

  handle("email.send_otp", (d) => ({
    subject: `Mã OTP xác thực giao dịch #${d.transactionId}`,
    text: `Mã OTP của bạn là: ${d.otpCode}. Có hiệu lực trong 5 phút, chỉ dùng được 1 lần.`,
  }));

  handle("email.send_confirmation", (d) => ({
    subject: `Thanh toán học phí thành công - giao dịch #${d.transactionId}`,
    text:
      `Bạn đã thanh toán học phí thành công.\n\n` +
      `Mã giao dịch: ${d.transactionId}\n` +
      `MSSV: ${d.mssv}\n` +
      `Số tiền: ${vnd(d.amount)}\n\n` +
      `Cảm ơn bạn đã sử dụng TDTU Pay.`,
  }));

  console.log("[OTP Consumer] Đang lắng nghe queue email.send_otp và email.send_confirmation");
}

module.exports = startConsumer;