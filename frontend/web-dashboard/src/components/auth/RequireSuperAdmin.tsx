import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';

interface RequireSuperAdminProps {
  children: ReactNode;
}

export default function RequireSuperAdmin({ children }: RequireSuperAdminProps) {
  const user = authStore.getUser();

  if (!user || !user.isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
