import { BILLING_TYPES } from '@mercon/shared-types';

const STORAGE_KEY = 'mercon_custom_billing_types';

/**
 * Gets user custom billing types from localStorage.
 */
export function getCustomBillingTypes(): string[] {
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
 * Returns the combined billing types list (Canonical + User Custom Billing Types).
 */
export function getAllBillingTypes(): string[] {
  const custom = getCustomBillingTypes();
  const base = [...BILLING_TYPES];
  
  // Merge unique
  const set = new Set([...base, ...custom]);
  return Array.from(set);
}

/**
 * Saves a new custom billing type (e.g. "Weekly", "Per Kilometer", "Quarterly Retainer").
 */
export function saveCustomBillingType(newType: string): string[] {
  const trimmed = newType.trim();
  if (!trimmed) return getAllBillingTypes();

  const current = getCustomBillingTypes();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom billing type to localStorage', e);
    }
  }

  return getAllBillingTypes();
}
