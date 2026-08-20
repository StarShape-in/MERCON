import { RATE_CATEGORIES } from '@mercon/shared-types';

const STORAGE_KEY = 'mercon_custom_rate_categories';

/**
 * Gets user custom rate categories from localStorage.
 */
export function getCustomRateCategories(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Returns the combined rate categories list (Canonical + User Custom Categories).
 */
export function getAllRateCategories(): string[] {
  const custom = getCustomRateCategories();
  const base = [...RATE_CATEGORIES];
  
  // Merge unique
  const set = new Set([...base, ...custom]);
  return Array.from(set);
}

/**
 * Saves a new custom rate category (e.g. "Hourly Duty", "Monthly Dedicated", "Express Local").
 */
export function saveCustomRateCategory(newCat: string): string[] {
  const trimmed = newCat.trim();
  if (!trimmed) return getAllRateCategories();

  const current = getCustomRateCategories();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom rate category to localStorage', e);
    }
  }

  return getAllRateCategories();
}
