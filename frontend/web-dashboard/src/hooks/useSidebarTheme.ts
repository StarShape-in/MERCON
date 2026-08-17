import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SIDEBAR_THEME_ID, getSidebarTheme } from '@/config/sidebarThemes';

const STORAGE_KEY = 'mercon_sidebar_theme';

function readStoredThemeId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_SIDEBAR_THEME_ID;
  } catch {
    return DEFAULT_SIDEBAR_THEME_ID;
  }
}

function applyThemeId(id: string) {
  document.documentElement.style.setProperty('--sidebar-bg', getSidebarTheme(id).bg);
}

/**
 * Sidebar background theme, persisted to localStorage and applied as the
 * --sidebar-bg CSS variable (Sidebar.tsx and its alt/border/hover shades
 * all read off that one variable via color-mix() in index.css).
 */
export function useSidebarTheme() {
  const [themeId, setThemeId] = useState<string>(readStoredThemeId);

  useEffect(() => {
    applyThemeId(themeId);
  }, [themeId]);

  const setTheme = useCallback((id: string) => {
    setThemeId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }, []);

  return { themeId, setTheme };
}
