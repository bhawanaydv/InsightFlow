import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading"><span className="spinner" /> Preparing your workspace…</div>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
