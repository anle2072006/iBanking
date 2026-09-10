const amqp = require("amqplib");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function startConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue("email.send_otp", { durable: true });

  ch.consume("email.send_otp", async (msg) => {
    if (!msg) return;
    const { email, otpCode, transactionId } = JSON.parse(msg.content.toString());

    try {
      await transporter.sendMail({
        from: '"TDTU Pay" <no-reply@tdtupay.local>',
        to: email,
        subject: `Mã OTP xác thực giao dịch #${transactionId}`,
        text: `Mã OTP của bạn là: ${otpCode}. Có hiệu lực trong 5 phút, chỉ dùng được 1 lần.`,
      });
      console.log(`[OTP Consumer] Đã gửi OTP tới ${email} cho giao dịch ${transactionId}`);
      ch.ack(msg);
    } catch (err) {
      console.error("[OTP Consumer] Gửi email thất bại:", err.message);
      ch.nack(msg, false, true); // đưa message trở lại queue để retry
    }
  });

  console.log("[OTP Consumer] Đang lắng nghe queue email.send_otp");
}

module.exports = startConsumer;
