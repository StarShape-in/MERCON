import type { DocType } from '@/services/documentService';

/** Human-friendly label for each DocType enum value. */
const DOC_TYPE_LABELS: Record<DocType, string> = {
  DriverLicense:       'Driver License',
  VehicleRegistration: 'Vehicle Registration',
  Insurance:           'Insurance Policy',
  POD:                 'Proof of Delivery',
  CustomsClearance:    'Customs Clearance',
  Waybill:             'Waybill',
  Contract:            'Contract Agreement',
  Invoice:             'Commercial Invoice',
  Emergency:           'Emergency Incident File',
};

export function docTypeLabel(t: string): string {
  return DOC_TYPE_LABELS[t as DocType] ?? t;
}

export type DocCategory = 'Drivers' | 'Vehicles' | 'Company' | 'Operations';

/** Map a document's owning entity_type to a UI category. */
export function categoryForEntity(entityType: string): DocCategory {
  switch (entityType) {
    case 'Driver': return 'Drivers';
    case 'Vehicle':
    case 'MaintenanceRecord': return 'Vehicles';
    case 'Trip': return 'Operations';
    default: return 'Company';
  }
}

/** Map a DocType to a UI category (each doc type belongs to exactly one). */
export function categoryForDocType(t: string): DocCategory {
  switch (t as DocType) {
    case 'DriverLicense': return 'Drivers';
    case 'VehicleRegistration':
    case 'Insurance': return 'Vehicles';
    case 'POD':
    case 'Waybill':
    case 'CustomsClearance':
    case 'Emergency': return 'Operations';
    case 'Contract':
    case 'Invoice': return 'Company';
    default: return 'Company';
  }
}

/** 
 * Whole calendar days from today until the given date (negative = already past).
 * Normalizes both today and the target date to midnight local time for exact day counting.
 */
export function daysUntil(iso: string | Date | null | undefined): number | null {
  if (!iso) return null;
  const targetDate = new Date(iso);
  if (Number.isNaN(targetDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'valid' | 'none';

/**
 * Standard classification for expiry dates across the entire application:
 * - null/undefined: 'none'
 * - <= 0 days: 'expired'
 * - 1 to 7 days: 'critical' (renewal required this week)
 * - 8 to 30 days: 'warning' (due soon in 30d window)
 * - > 30 days: 'valid'
 */
export function getExpiryStatus(iso: string | Date | null | undefined): ExpiryStatus {
  const days = daysUntil(iso);
  if (days === null) return 'none';
  if (days <= 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'valid';
}

/** Formats days remaining into human friendly badge text */
export function formatExpiryText(days: number | null): string {
  if (days === null) return 'No Expiry';
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 7) return `Critical: ${days}d left`;
  if (days <= 30) return `Due in ${days}d`;
  return `${days}d left`;
}

