import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FeeSearch from "./pages/FeeSearch";
import PaymentConfirm from "./pages/PaymentConfirm";
import OtpVerify from "./pages/OtpVerify";
import Result from "./pages/Result";
import History from "./pages/History";
import Account from "./pages/Account";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/fee-search"
          element={
            <PrivateRoute>
              <FeeSearch />
            </PrivateRoute>
          }
        />
        <Route
          path="/payment-confirm"
          element={
            <PrivateRoute>
              <PaymentConfirm />
            </PrivateRoute>
          }
        />
        <Route
          path="/otp-verify"
          element={
            <PrivateRoute>
              <OtpVerify />
            </PrivateRoute>
          }
        />
        <Route
          path="/result"
          element={
            <PrivateRoute>
              <Result />
            </PrivateRoute>
          }
        />
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <History />
            </PrivateRoute>
          }
        />
        <Route
          path="/account"
          element={
            <PrivateRoute>
              <Account />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
