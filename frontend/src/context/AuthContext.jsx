import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, registerUser, getProfile, setAuthToken } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        if (token) {
          setAuthToken(token);
          const userData = await getProfile(token);
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Token verification failed', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    try {
      setError(null);
      const data = await loginUser(email, password);
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setAuthToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        return true;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const register = async (username, email, password) => {
    try {
      setError(null);
      const data = await registerUser(username, email, password);
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setAuthToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        return true;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 