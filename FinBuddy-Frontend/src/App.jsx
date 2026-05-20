import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";

// 🔐 Dinamik Korumalı Rota Bileşeni
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem("buddyocto_user");
  return user ? children : <Navigate to="/Login" replace />;
};

// 🔓 Giriş Yapmış Kullanıcının Login'e Tekrar Girmesini Engelleyen Rota
const PublicRoute = ({ children }) => {
  const user = localStorage.getItem("buddyocto_user");
  return user ? <Navigate to="/Dashboard" replace /> : children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Kök dizine gelinirse duruma göre yönlendir */}
        <Route
          path="/"
          element={
            localStorage.getItem("buddyocto_user") ? (
              <Navigate to="/Dashboard" replace />
            ) : (
              <Navigate to="/Login" replace />
            )
          }
        />

        {/* Login Sayfası */}
        <Route
          path="/Login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Dashboard Sayfası */}
        <Route
          path="/Dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;