const axios = require("axios");

const BASE_URL = process.env.USER_SERVICE_URL;

exports.deductBalance = async (userId, amount, transactionId) => {
  try {
    const { data } = await axios.post(`${BASE_URL}/api/users/${userId}/deduct`, { amount, transactionId});
    return { success: true, ...data };
  } catch (err) {
    return {
      success: false,
      statusCode: err.response?.status || 500,
      message: err.response?.data?.message || "Lỗi khi gọi User Service",
    };
  }
};

exports.refundBalance = async (userId, amount, transactionId) => {
  const { data } = await axios.post(`${BASE_URL}/api/users/${userId}/refund`, { amount, transactionId });
  return data;
};

exports.getProfile = async (userId) => {
  const { data } = await axios.get(`${BASE_URL}/api/users/${userId}`);
  return data;
};
