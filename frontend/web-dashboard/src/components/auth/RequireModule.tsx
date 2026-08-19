import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settingsService';
import type { ModuleKey } from '@mercon/shared-types';

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

  if (isLoading && !settings) {
    return (
      <div className="flex items-center justify-center min-h-[300px] h-full w-full">
        <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-brand animate-spin" />
      </div>
    );
  }

  // Only redirect if settings explicitly returned an enabledModules list that does not include this module
  if (settings && Array.isArray(settings.enabledModules) && !settings.enabledModules.includes(moduleKey)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
