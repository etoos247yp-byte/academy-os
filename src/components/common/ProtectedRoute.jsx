import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStudent } from '../../contexts/StudentContext';
import { FullPageLoader } from './LoadingSpinner';

export function AdminRoute({ children }) {
  const { admin, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <FullPageLoader message="인증 확인 중..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

export function SuperAdminRoute({ children }) {
  const { admin, loading, isAuthenticated, isSuperAdmin } = useAuth();

  if (loading) {
    return <FullPageLoader message="인증 확인 중..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}

export function StudentRoute({ children }) {
  const { student, loading, isLoggedIn } = useStudent();

  if (loading) {
    return <FullPageLoader message="로딩 중..." />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return children;
}
