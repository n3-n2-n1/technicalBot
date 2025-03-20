import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Layout
const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      <main className="app-main-content">
        {children}
      </main>
    </>
  );
};

// Auth Layout (without navbar)
const AuthLayout = ({ children }) => {
  return (
    <div className="auth-layout">
      {children}
    </div>
  );
};

const App = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Routes>
        <Route path="/login" element={
          !isAuthenticated ? (
            <AuthLayout>
              <Login />
            </AuthLayout>
          ) : (
            <Navigate to="/dashboard" />
          )
        } />
        <Route path="/register" element={
          !isAuthenticated ? (
            <AuthLayout>
              <Register />
            </AuthLayout>
          ) : (
            <Navigate to="/dashboard" />
          )
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/chat/:chatId" element={
          <ProtectedRoute>
            <Layout>
              <Chat />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </div>
  );
};

export default App; 