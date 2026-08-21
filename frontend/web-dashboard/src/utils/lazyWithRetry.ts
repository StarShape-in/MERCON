import { lazy, ComponentType } from 'react';

/**
 * Checks whether an error is caused by a failed dynamic import / chunk load failure.
 * This happens when a new version of the app is deployed and old chunk files are removed,
 * or when there is a transient network disruption during code-splitting chunk fetch.
 */
export function isChunkLoadError(error: any): boolean {
  if (!error) return false;
  const message = typeof error === 'string' ? error : error.message || error.toString();
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /loading chunk .* failed/i.test(message) ||
    /Failed to load module script/i.test(message)
  );
}

/**
 * Wraps React.lazy with automatic chunk-retry and smart page auto-refresh logic.
 * If a newly deployed bundle causes dynamic import to fail (404 on old chunk hash),
 * it first attempts short retries. If retries fail, it reloads the page once with
 * a 15-second cooldown to fetch fresh chunk URLs.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const maxRetries = 2;
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        const component = await componentImport();
        return component;
      } catch (error) {
        attempts++;
        if (attempts <= maxRetries && isChunkLoadError(error)) {
          // Wait 300ms * attempt count before retrying the import
          await new Promise((resolve) => setTimeout(resolve, 300 * attempts));
          continue;
        }

        if (isChunkLoadError(error)) {
          const STORAGE_KEY = 'retry-lazy-last-reload';
          const lastReloadStr = window.sessionStorage.getItem(STORAGE_KEY);
          const now = Date.now();
          const cooldownPeriod = 15000; // 15-second cooldown to prevent infinite reload loops

          const lastReload = lastReloadStr ? parseInt(lastReloadStr, 10) : 0;
          if (isNaN(lastReload) || now - lastReload > cooldownPeriod) {
            window.sessionStorage.setItem(STORAGE_KEY, now.toString());
            window.location.reload();
          }
        }

        throw error;
      }
    }

    throw new Error('Failed to load component chunk after retries');
  });
}

export default lazyWithRetry;

