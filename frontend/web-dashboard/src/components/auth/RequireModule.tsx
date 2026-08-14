import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settingsService';
import type { ModuleKey } from '@mercon/shared-types';
import FullPageSpinner from '@/components/ui/FullPageSpinner';

interface RequireModuleProps {
  moduleKey: ModuleKey;
  children: ReactNode;
}

/** Blocks direct navigation to a disabled module's URL — Sidebar already hides the link. */
export default function RequireModule({ moduleKey, children }: RequireModuleProps) {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
    staleTime: 60000,
  });

  if (isLoading) return <FullPageSpinner />;
  if (settings && !settings.enabledModules.includes(moduleKey)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
