const axios = require("axios");

const BASE_URL = process.env.OTP_SERVICE_URL;

exports.requestOtp = async (transactionId, email) => {
  const { data } = await axios.post(`${BASE_URL}/api/otp/generate`, {
    transactionId,
    email,
  });
  return data;
};

exports.verifyOtp = async (transactionId, otpCode) => {
  try {
    const { data } = await axios.post(`${BASE_URL}/api/otp/verify`, {
      transactionId,
      otpCode,
    });
    return { success: true, ...data };
  } catch (err) {
    return {
      success: false,
      statusCode: err.response?.status || 500,
      message: err.response?.data?.message || "Lỗi khi gọi OTP Service",
    };
  }
};
