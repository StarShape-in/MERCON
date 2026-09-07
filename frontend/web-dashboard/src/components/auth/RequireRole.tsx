import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';

interface RequireRoleProps {
  roles: string[];
  children: ReactNode;
}

export default function RequireRole({ roles, children }: RequireRoleProps) {
  const user = authStore.getUser();

  const isSuperAdmin = user?.role === 'SuperAdmin' || (user as any)?.isSuperAdmin === true;
  const isAllowed = user?.role ? (roles.includes(user.role) || (isSuperAdmin && (roles.includes('Admin') || roles.includes('SuperAdmin')))) : false;

  if (!user || !user.role || !isAllowed) {
    // Redirect to dashboard if they don't have permission
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
