import { createContext, useContext, useState, useEffect } from 'react';
import * as authService from '../services/auth.service';
// import { useNavigate } from 'react-router-dom'; // Can't use navigate here if provider is inside BrowserRouter, but usually it is.

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStoredToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
  const getStorageTarget = () => {
    const pref = localStorage.getItem('auth_storage');
    if (pref === 'local') return localStorage;
    if (pref === 'session') return sessionStorage;
    return localStorage.getItem('token') ? localStorage : sessionStorage;
  };

  const decodeTokenPayload = (token) => {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  };

  const refreshUser = async () => {
    const userData = await authService.getCurrentUser();
    const normalizedUser = userData.user || userData;
    setUser(normalizedUser);
    return normalizedUser;
  };

  useEffect(() => {
    const checkUser = async () => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        await refreshUser();
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // User is not authenticated, which is expected for guests
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          setUser(null);
        } else {
          console.error("Authentication check failed", error);
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = async (credentials) => {
    const data = await authService.loginUser(credentials);
    if (data.accessToken) {
      if (credentials?.rememberMe) {
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('auth_storage', 'local');
        sessionStorage.removeItem('token');
      } else {
        sessionStorage.setItem('token', data.accessToken);
        localStorage.setItem('auth_storage', 'session');
        localStorage.removeItem('token');
      }

      const tokenData = decodeTokenPayload(data.accessToken);
      if (tokenData?.userId || tokenData?.email) {
        setUser((prev) => ({
          ...(prev || {}),
          userId: tokenData.userId,
          email: tokenData.email
        }));
      }
    }

    try {
      return await refreshUser();
    } catch {
      return data;
    }
  };

  const setAuthSession = async ({ accessToken, user: initialUser }) => {
    if (!accessToken) return null;
    const storage = getStorageTarget();
    storage.setItem('token', accessToken);
    if (storage === localStorage) {
      localStorage.setItem('auth_storage', 'local');
    } else {
      localStorage.setItem('auth_storage', 'session');
    }

    if (initialUser) setUser(initialUser);
    return await refreshUser();
  };

  const register = async (userData) => {
    return await authService.registerUser(userData);
  };

  const logout = async () => {
    await authService.logoutUser();
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('auth_storage');
    setUser(null);
    // window.location.href = '/login'; // detailed handling in components
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser, setAuthSession }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
