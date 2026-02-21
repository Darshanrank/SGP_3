import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_STORAGE_KEY = 'auth_storage';

const getTokenStorage = () => {
  const explicit = localStorage.getItem(AUTH_STORAGE_KEY);
  if (explicit === 'local') return localStorage;
  if (explicit === 'session') return sessionStorage;
  // Fallback: if token exists in local, use that, else session
  return localStorage.getItem('token') ? localStorage : sessionStorage;
};

const setAccessToken = (token) => {
  if (!token) return;
  const store = getTokenStorage();
  store.setItem('token', token);
};

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  refreshQueue = [];
};

// Response interceptor with refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthRoute = originalRequest?.url?.includes('/auth/refresh');

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          if (token && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const bare = axios.create({
          baseURL: api.defaults.baseURL,
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        });
        const refreshResponse = await bare.post('/auth/refresh');
        const newAccessToken = refreshResponse.data?.accessToken;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          processQueue(null, newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);
        }
        processQueue(new Error('No access token from refresh'));
        return Promise.reject(error);
      } catch (refreshErr) {
        processQueue(refreshErr);
        // Clear tokens on hard failure
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
