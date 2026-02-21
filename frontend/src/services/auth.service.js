// src/services/auth.service.js
import api from './api';

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const refreshSession = async () => {
  const response = await api.post('/auth/refresh');
  return response.data;
};

export const verifyEmail = async (token) => {
  const response = await api.get(`/auth/verify/${token}`);
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/reset-password', { email });
  return response.data;
};

export const resetPassword = async (token, newPassword) => {
  const response = await api.post(`/auth/reset-password/${token}`, { password: newPassword });
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getCurrentUser = async () => {
    // If you have a refresh token mechanism, you might use /profile/me to validate
    // But typically you'd call /profile/me to check session validity on load.
    const response = await api.get('/profile/me');
    return response.data;
};
