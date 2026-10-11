import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('access_token'));
  const [mfaData, setMfaData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = sessionStorage.getItem('access_token');
      const storedRole = sessionStorage.getItem('user_role');
      const storedUsername = sessionStorage.getItem('username');

      if (storedToken && storedUsername && storedRole) {
        setUser({ username: storedUsername, role: storedRole });
        setToken(storedToken);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const loginStep1 = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    setMfaData({
      mfa_token: response.data.mfa_token,
      mock_otp: response.data.mock_otp,
      username,
    });
    return response.data;
  };

  const verifyOtp = async (otpCode) => {
    if (!mfaData?.mfa_token) {
      throw new Error('No pending MFA session found. Please re-login.');
    }

    const response = await api.post('/auth/verify-otp', {
      mfa_token: mfaData.mfa_token,
      otp_code: otpCode,
    });

    const { access_token, role, username } = response.data;

    // Secure Session Storage (cleared when browser session ends)
    sessionStorage.setItem('access_token', access_token);
    sessionStorage.setItem('user_role', role);
    sessionStorage.setItem('username', username);

    setToken(access_token);
    setUser({ username, role });
    setMfaData(null);

    return response.data;
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('user_role');
      sessionStorage.removeItem('username');
      setToken(null);
      setUser(null);
      setMfaData(null);
    }
  };

  const register = async (username, email, password) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        mfaData,
        setMfaData,
        loginStep1,
        verifyOtp,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
