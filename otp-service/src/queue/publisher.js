const amqp = require("amqplib");

let channel;

async function getChannel() {
  if (channel) return channel;
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue("email.send_otp", { durable: true });
  await channel.assertQueue("email.send_confirmation", { durable: true });
  return channel;
}

exports.publishSendOtpEmail = async ({ email, otpCode, transactionId }) => {
  const ch = await getChannel();
  ch.sendToQueue(
    "email.send_otp",
    Buffer.from(JSON.stringify({ email, otpCode, transactionId })),
    { persistent: true }
  );
};
