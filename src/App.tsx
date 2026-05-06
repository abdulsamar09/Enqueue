import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { NoBusinessYet, RequireBusiness } from './components/BusinessOnboardingRedirect';

import DashboardPage from './pages/DashboardPage';
import CreateBusinessPage from './pages/CreateBusinessPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import QueuePublicPage from './pages/QueuePublicPage';
import SignupPage from './pages/SignupPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* IMPORTANT: public QR queue route */}
      <Route path="/queue/:slug" element={<QueuePublicPage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RequireBusiness>
              <DashboardPage />
            </RequireBusiness>
          </ProtectedRoute>
        }
      />

      <Route
        path="/create-business"
        element={
          <ProtectedRoute>
            <NoBusinessYet>
              <CreateBusinessPage />
            </NoBusinessYet>
          </ProtectedRoute>
        }
      />

      {/* fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}