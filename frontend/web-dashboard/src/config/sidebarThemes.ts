/**
 * Sidebar background presets — every option is a variation of orange (or the
 * original neutral charcoal) chosen to stay readable with the brand orange
 * accent (--color-brand, #E8450F) and the white text/logo already used
 * throughout the sidebar. Only the base --sidebar-bg is stored per theme;
 * the alt/border/hover shades are derived from it via color-mix() in index.css.
 */
export interface SidebarTheme {
  id: string;
  name: string;
  bg: string;
}

export const SIDEBAR_THEMES: SidebarTheme[] = [
  { id: 'sunset-ember', name: 'Sunset Ember', bg: '#2B160B' },
  { id: 'espresso-orange', name: 'Espresso Orange', bg: '#241713' },
  { id: 'burnt-sienna', name: 'Burnt Sienna', bg: '#3D2013' },
  { id: 'cinnamon-bark', name: 'Cinnamon Bark', bg: '#34160A' },
  { id: 'amber-charcoal', name: 'Amber Charcoal', bg: '#221D16' },
  { id: 'classic-charcoal', name: 'Classic Charcoal', bg: '#18181B' },
];

export const DEFAULT_SIDEBAR_THEME_ID = SIDEBAR_THEMES[0].id;

export function getSidebarTheme(id: string | null | undefined): SidebarTheme {
  return SIDEBAR_THEMES.find((t) => t.id === id) ?? SIDEBAR_THEMES[0];
}
