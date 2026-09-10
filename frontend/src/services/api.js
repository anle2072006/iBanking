import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (username, password) =>
  api.post("/auth/login", { username, password }).then((r) => r.data);

export const getProfile = (userId) =>
  api.get(`/users/${userId}`).then((r) => r.data);

export const lookupFee = (mssv) =>
  api.get(`/fees/${mssv}`).then((r) => r.data);

export const initiateTransaction = (payload) =>
  api.post("/transactions", payload).then((r) => r.data);

export const verifyOtp = (transactionId, otpCode) =>
  api.post(`/transactions/${transactionId}/verify-otp`, { otpCode }).then((r) => r.data);

export const getHistory = (userId) =>
  api.get(`/users/${userId}/transactions`).then((r) => r.data);

export default api;
