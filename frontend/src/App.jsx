import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import CoordinatorDashboard from './pages/CoordinatorDashboard.jsx';
import ActivitiesPage from './pages/ActivitiesPage.jsx';
import CandidatesPage from './pages/CandidatesPage.jsx';
import LearnerDetailPage from './pages/LearnerDetailPage.jsx';
import MyTrainingPage from './pages/MyTrainingPage.jsx';
import LandingPage from './pages/LandingPage.jsx';

function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Loading..." />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <LoadingSpinner message="Loading application..." />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? (user.mustChangePassword ? <Navigate to="/change-password" replace /> : user.role === 'Coordinator' ? <Navigate to="/dashboard" replace /> : <Navigate to="/my-training" replace />) : <LandingPage />} />

      <Route
        path="/login"
        element={
          user ? (
            user.mustChangePassword ? (
              <Navigate to="/change-password" replace />
            ) : user.role === 'Coordinator' ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/my-training" replace />
            )
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="/change-password"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : (
            <ChangePasswordPage />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRole="Coordinator">
            <CoordinatorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/activities"
        element={
          <ProtectedRoute allowedRole="Coordinator">
            <ActivitiesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/candidates"
        element={
          <ProtectedRoute allowedRole="Coordinator">
            <CandidatesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/learners/:id"
        element={
          <ProtectedRoute allowedRole="Coordinator">
            <LearnerDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-training"
        element={
          <ProtectedRoute allowedRole="Candidate">
            <MyTrainingPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
