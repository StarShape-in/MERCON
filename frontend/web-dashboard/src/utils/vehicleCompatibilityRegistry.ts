import { getAllTaxonomyOptions, TaxonomyOption, TAXONOMY_UPDATED_EVENT } from './taxonomyRegistry';

export interface VehicleCompatibilityRule {
  id: string;
  serviceVehicleClassId: string; // ID of the commercial service class (from TaxonomyOption)
  serviceVehicleClassCode: string; // Code e.g. '10 TON'
  preferredVehicleClassCodes: string[]; // Array of vehicle class codes preferred
  allowedVehicleClassCodes: string[]; // Array of vehicle class codes allowed
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const COMPATIBILITY_STORAGE_KEY = 'mercon_vehicle_compatibility_rules_v1';
export const COMPATIBILITY_UPDATED_EVENT = 'mercon-vehicle-compatibility-updated';

// Canonical default compatibility rules for initial setup
const DEFAULT_RULES: VehicleCompatibilityRule[] = [
  {
    id: 'compat_vc_3_4_ton',
    serviceVehicleClassId: 'vc_3_4_ton',
    serviceVehicleClassCode: '3-4 TON',
    preferredVehicleClassCodes: ['3-4 TON'],
    allowedVehicleClassCodes: ['3-4 TON', '5 TON'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'compat_vc_5_ton',
    serviceVehicleClassId: 'vc_5_ton',
    serviceVehicleClassCode: '5 TON',
    preferredVehicleClassCodes: ['5 TON'],
    allowedVehicleClassCodes: ['5 TON', '3-4 TON', '10 TON'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'compat_vc_10_ton',
    serviceVehicleClassId: 'vc_10_ton',
    serviceVehicleClassCode: '10 TON',
    preferredVehicleClassCodes: ['10 TON'],
    allowedVehicleClassCodes: ['10 TON', '5 TON', '20 TON'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'compat_vc_20_ton',
    serviceVehicleClassId: 'vc_20_ton',
    serviceVehicleClassCode: '20 TON',
    preferredVehicleClassCodes: ['20 TON'],
    allowedVehicleClassCodes: ['20 TON', '10 TON', '40 FEET'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'compat_vc_40_feet',
    serviceVehicleClassId: 'vc_40_feet',
    serviceVehicleClassCode: '40 FEET',
    preferredVehicleClassCodes: ['40 FEET'],
    allowedVehicleClassCodes: ['40 FEET', '20 TON'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Normalizes rule to guarantee Preferred ⊆ Allowed
 */
export function normalizeCompatibilityRule(rule: Partial<VehicleCompatibilityRule>): VehicleCompatibilityRule {
  const preferred = Array.from(new Set(rule.preferredVehicleClassCodes || []));
  let allowed = Array.from(new Set(rule.allowedVehicleClassCodes || []));

  // Enforce rule: Preferred vehicle classes MUST automatically be considered allowed
  preferred.forEach((code) => {
    if (!allowed.includes(code)) {
      allowed.push(code);
    }
  });

  return {
    id: rule.id || `compat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    serviceVehicleClassId: rule.serviceVehicleClassId || '',
    serviceVehicleClassCode: rule.serviceVehicleClassCode || '',
    preferredVehicleClassCodes: preferred,
    allowedVehicleClassCodes: allowed,
    isActive: rule.isActive !== false,
    createdAt: rule.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Gets all vehicle compatibility rules from storage or canonical defaults
 */
export function getAllCompatibilityRules(): VehicleCompatibilityRule[] {
  try {
    const raw = localStorage.getItem(COMPATIBILITY_STORAGE_KEY);
    if (!raw) {
      // Save default initial canonical rules
      localStorage.setItem(COMPATIBILITY_STORAGE_KEY, JSON.stringify(DEFAULT_RULES));
      return DEFAULT_RULES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_RULES;
    return parsed.map(normalizeCompatibilityRule);
  } catch (e) {
    console.error('Failed to load vehicle compatibility rules from localStorage', e);
    return DEFAULT_RULES;
  }
}

/**
 * Finds a rule by service vehicle class code or ID
 */
export function getCompatibilityRuleForClass(codeOrId: string): VehicleCompatibilityRule | null {
  const rules = getAllCompatibilityRules();
  return (
    rules.find(
      (r) =>
        r.serviceVehicleClassId === codeOrId ||
        r.serviceVehicleClassCode.toLowerCase() === codeOrId.toLowerCase()
    ) || null
  );
}

/**
 * Saves or updates a vehicle compatibility rule
 */
export function saveCompatibilityRule(inputRule: Partial<VehicleCompatibilityRule>): VehicleCompatibilityRule {
  const rules = getAllCompatibilityRules();
  const normalized = normalizeCompatibilityRule(inputRule);

  const existingIdx = rules.findIndex(
    (r) =>
      r.id === normalized.id ||
      (r.serviceVehicleClassCode &&
        r.serviceVehicleClassCode.toLowerCase() === normalized.serviceVehicleClassCode.toLowerCase())
  );

  if (existingIdx >= 0) {
    rules[existingIdx] = {
      ...rules[existingIdx],
      ...normalized,
      id: rules[existingIdx].id,
      updatedAt: new Date().toISOString(),
    };
  } else {
    rules.push(normalized);
  }

  try {
    localStorage.setItem(COMPATIBILITY_STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new CustomEvent(COMPATIBILITY_UPDATED_EVENT));
  } catch (e) {
    console.error('Failed to save vehicle compatibility rule', e);
  }

  return normalized;
}

/**
 * Deletes a compatibility rule by ID
 */
export function deleteCompatibilityRule(id: string): void {
  const rules = getAllCompatibilityRules();
  const filtered = rules.filter((r) => r.id !== id);
  try {
    localStorage.setItem(COMPATIBILITY_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent(COMPATIBILITY_UPDATED_EVENT));
  } catch (e) {
    console.error('Failed to delete vehicle compatibility rule', e);
  }
}

/**
 * Audit rule against current taxonomy vehicle classes to detect inactive or missing references
 */
export function auditRuleAgainstTaxonomy(
  rule: VehicleCompatibilityRule,
  vehicleClassOptions: TaxonomyOption[]
): {
  isValid: boolean;
  inactivePreferredCodes: string[];
  inactiveAllowedCodes: string[];
  missingCodes: string[];
} {
  const activeClassCodes = new Set(
    vehicleClassOptions.filter((o) => o.isActive !== false).map((o) => o.code.toLowerCase())
  );
  const allClassCodes = new Set(vehicleClassOptions.map((o) => o.code.toLowerCase()));

  const inactivePreferred = rule.preferredVehicleClassCodes.filter(
    (code) => allClassCodes.has(code.toLowerCase()) && !activeClassCodes.has(code.toLowerCase())
  );
  const inactiveAllowed = rule.allowedVehicleClassCodes.filter(
    (code) => allClassCodes.has(code.toLowerCase()) && !activeClassCodes.has(code.toLowerCase())
  );

  const missingPreferred = rule.preferredVehicleClassCodes.filter(
    (code) => !allClassCodes.has(code.toLowerCase())
  );
  const missingAllowed = rule.allowedVehicleClassCodes.filter(
    (code) => !allClassCodes.has(code.toLowerCase())
  );

  const inactivePreferredCodes = Array.from(new Set(inactivePreferred));
  const inactiveAllowedCodes = Array.from(new Set(inactiveAllowed));
  const missingCodes = Array.from(new Set([...missingPreferred, ...missingAllowed]));

  const isValid =
    inactivePreferredCodes.length === 0 &&
    inactiveAllowedCodes.length === 0 &&
    missingCodes.length === 0;

  return {
    isValid,
    inactivePreferredCodes,
    inactiveAllowedCodes,
    missingCodes,
  };
}
