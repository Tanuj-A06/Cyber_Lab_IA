import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attaches Bearer token from sessionStorage
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handles session expirations & rate limits
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint =
        error.config.url.includes('/auth/login') ||
        error.config.url.includes('/auth/verify-otp') ||
        error.config.url.includes('/auth/register');

      if (!isAuthEndpoint) {
        // Token expired or revoked: clear session
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('user_role');
        sessionStorage.removeItem('username');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
