import { lazy, ComponentType } from 'react';

/**
 * Wraps React.lazy with automatic chunk-retry logic. If a newly deployed bundle
 * causes dynamic import to fail (404 on old chunk hash), it reloads the page once to fetch
 * the latest index.html and fresh chunk URLs.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageHasAlreadyBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem('retry-lazy-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('retry-lazy-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenRefreshed) {
        window.sessionStorage.setItem('retry-lazy-refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
}

export default lazyWithRetry;
