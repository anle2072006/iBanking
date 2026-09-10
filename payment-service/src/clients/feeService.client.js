const axios = require("axios");

const BASE_URL = process.env.FEE_SERVICE_URL;

exports.lookup = async (mssv) => {
  const { data } = await axios.get(`${BASE_URL}/api/fees/${mssv}`);
  return data;
};

exports.reserve = async (mssv) => {
  try {
    const { data } = await axios.post(`${BASE_URL}/api/fees/${mssv}/reserve`);
    return { success: true, fee: data };
  } catch (err) {
    return {
      success: false,
      statusCode: err.response?.status || 500,
      message: err.response?.data?.message || "Lỗi khi gọi Fee Service",
    };
  }
};

exports.confirmPayment = async (mssv, amount) => {
  const { data } = await axios.post(`${BASE_URL}/api/fees/${mssv}/confirm`, { amount });
  return data;
};

exports.release = async (mssv) => {
  const { data } = await axios.post(`${BASE_URL}/api/fees/${mssv}/release`);
  return data;
};
