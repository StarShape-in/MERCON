import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settingsService';

/**
 * This deployment's branding (appName/logoUrl/primaryColor), fetched once and
 * shared via react-query's cache across every caller — safe to call from
 * multiple components (LoginPage, Sidebar, BrandLogo) without duplicate
 * requests. Unauthenticated endpoint, so it works pre-login too.
 */
export function useBranding() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: settingsService.getPublic,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Applies the fetched branding to the page: writes --color-brand (every
 * bg-brand/text-brand/... Tailwind utility reads this at paint time, so one
 * write reskins the whole app) and sets document.title. Mount once near the
 * app root — LoginPage and the authenticated shell both render underneath it.
 */
export function useApplyBranding() {
  const { data } = useBranding();

  useEffect(() => {
    if (!data) return;
    if (data.primaryColor) {
      document.documentElement.style.setProperty('--color-brand', data.primaryColor);
      document.documentElement.style.setProperty(
        '--color-brand-hover',
        `color-mix(in srgb, ${data.primaryColor} 80%, black)`,
      );
      document.documentElement.style.setProperty(
        '--color-brand-light',
        `color-mix(in srgb, ${data.primaryColor} 10%, white)`,
      );
    }
    if (data.appName) document.title = data.appName;
  }, [data]);
}
