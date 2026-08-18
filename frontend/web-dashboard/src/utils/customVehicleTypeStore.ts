import { VEHICLE_TYPES } from '@mercon/shared-types';

const STORAGE_KEY = 'mercon_custom_vehicle_types';

/**
 * Gets all vehicle types, combining standard canonical types + user custom added types.
 */
export function getCustomVehicleTypes(): string[] {
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
 * Returns the combined vehicle types list (Canonical + User Custom Types).
 */
export function getAllVehicleTypes(): string[] {
  const custom = getCustomVehicleTypes();
  const base = [...VEHICLE_TYPES];
  
  // Merge unique
  const set = new Set([...base, ...custom]);
  return Array.from(set);
}

/**
 * Saves a new custom vehicle type (e.g. "20 TON", "25 TON", "12M FLATBED").
 */
export function saveCustomVehicleType(newType: string): string[] {
  const trimmed = newType.trim().toUpperCase();
  if (!trimmed) return getAllVehicleTypes();

  const current = getCustomVehicleTypes();
  if (!current.includes(trimmed)) {
    const updated = [...current, trimmed];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom vehicle type to localStorage', e);
    }
  }

  return getAllVehicleTypes();
}
