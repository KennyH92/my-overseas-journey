import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useHasRole, type AppRole } from '@/hooks/use-user-roles';
import { FirstLoginCheck } from '@/components/auth/FirstLoginCheck';
import { AppLayout } from '@/components/layout/AppLayout';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function RoleProtectedRoute({ children, allowedRoles = [] }: RoleProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isLoading: rolesLoading } = useHasRole(allowedRoles);

  // Show loading while checking auth or roles
  if (authLoading || (user && rolesLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if user doesn't have required role
  if (allowedRoles.length > 0 && !hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <FirstLoginCheck>
      <AppLayout>{children}</AppLayout>
    </FirstLoginCheck>
  );
}
