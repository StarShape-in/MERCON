import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface CanProps {
  I: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component wrapper that conditionally renders its children if the current authenticated
 * user has the required permission(s).
 */
export function Can({ I, fallback = null, children }: CanProps) {
  const { can, canAny } = usePermissions();

  const isAllowed = Array.isArray(I) ? canAny(I) : can(I);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
