import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Home from './pages/Home';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Customize as needed
      retry: 1,
    },
  },
});

// Protected Route Component
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import MySkills from './pages/MySkills';
import DiscoverSkillsPage from './pages/DiscoverSkills';
import Swaps from './pages/Swaps';
import SwapClassroom from './pages/SwapClassroom';
import NewSwapRequest from './pages/NewSwapRequest';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import AddSkill from './pages/AddSkill';
import Notifications from './pages/Notifications';
import NotificationSettings from './pages/NotificationSettings';
import Calendar from './pages/Calendar';
import NotFound from './pages/NotFound';
import Rewards from './pages/Rewards';
import Leaderboard from './pages/Leaderboard';
import AdminReports from './pages/AdminReports';
import AdminPenalties from './pages/AdminPenalties';
import AdminBadges from './pages/AdminBadges';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    ); 
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
    return children;
};

const HomeRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Home />;
};

// Admin Route Component (requires admin role)
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    ); 
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
        <Layout>
          <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/skills" element={<ProtectedRoute><MySkills /></ProtectedRoute>} />
          <Route path="/discover" element={<ProtectedRoute><DiscoverSkillsPage /></ProtectedRoute>} />
          <Route path="/skills/new" element={<ProtectedRoute><AddSkill /></ProtectedRoute>} />
          <Route path="/swaps" element={<ProtectedRoute><Swaps /></ProtectedRoute>} />
          <Route path="/swaps/new" element={<ProtectedRoute><NewSwapRequest /></ProtectedRoute>} />
          <Route path="/swaps/:id" element={<ProtectedRoute><SwapClassroom /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
          <Route path="/admin/penalties" element={<AdminRoute><AdminPenalties /></AdminRoute>} />
          <Route path="/admin/badges" element={<AdminRoute><AdminBadges /></AdminRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </SocketProvider>
    </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
