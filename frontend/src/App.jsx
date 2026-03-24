import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LoadingScreen from './components/ui/LoadingScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Customize as needed
      retry: 1,
    },
  },
});

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MySkills = lazy(() => import('./pages/MySkills'));
const DiscoverSkillsPage = lazy(() => import('./pages/DiscoverSkills'));
const Swaps = lazy(() => import('./pages/Swaps'));
const SwapClassroom = lazy(() => import('./pages/SwapClassroom'));
const NewSwapRequest = lazy(() => import('./pages/NewSwapRequest'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const AddSkill = lazy(() => import('./pages/AddSkill'));
const Notifications = lazy(() => import('./pages/Notifications'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const Calendar = lazy(() => import('./pages/Calendar'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminPenalties = lazy(() => import('./pages/AdminPenalties'));
const AdminBadges = lazy(() => import('./pages/AdminBadges'));

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
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><Register /></PublicRoute>} />
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
          </Suspense>
        </Layout>
    </SocketProvider>
    </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
