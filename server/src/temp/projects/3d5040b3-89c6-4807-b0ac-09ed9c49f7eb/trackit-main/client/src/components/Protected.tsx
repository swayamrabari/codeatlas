import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const Protected = () => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // No need to call checkAuthStatus here since it's already called in App.tsx
  // and we wait for it to complete before rendering routes

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role === 'admin' && !isAdminRoute) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};


