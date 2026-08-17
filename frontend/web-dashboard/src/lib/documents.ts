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
  Passport:            'Passport',
};

export function docTypeLabel(t: string): string {
  return DOC_TYPE_LABELS[t as DocType] ?? t;
}

/**
 * The label to actually show for a document. Every document still carries the
 * legacy `doc_type` enum (kept for back-compat readers), but its configured
 * `documentType` — e.g. "Isthimara" instead of the legacy "Vehicle
 * Registration" — is the real, owner-facing name once one is linked. Falls
 * back to the legacy label only for documents that predate DocumentType
 * linking (should be none after the seed backfill, but stay defensive).
 */
export function documentDisplayName(doc: { doc_type: string; documentType?: { name: string } | null }): string {
  return doc.documentType?.name || docTypeLabel(doc.doc_type);
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
    case 'DriverLicense':
    case 'Passport': return 'Drivers';
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

/**
 * Resolves a file_url to a valid browser URL regardless of environment or hardcoded localhost ports.
 */
export function resolveFileUrl(fileUrl: string | null | undefined): string {
  if (!fileUrl) return '';

  const rawUrl = fileUrl.trim();

  // If stored file_url is legacy 'http://localhost:3000/uploads/xyz.jpg' or 'http://localhost:4000/uploads/xyz.jpg',
  // strip hardcoded origin so browser resolves it via current API origin/relative path!
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(rawUrl)) {
    try {
      const parsed = new URL(rawUrl);
      const apiBase = import.meta.env.VITE_API_URL || '';
      if (apiBase.startsWith('http')) {
        const apiOrigin = new URL(apiBase).origin;
        return `${apiOrigin}${parsed.pathname}`;
      }
      return parsed.pathname;
    } catch {
      // fallback
    }
  }

  // If relative path like '/uploads/file-123.jpg', attach API origin if VITE_API_URL is an absolute HTTP url
  if (rawUrl.startsWith('/')) {
    const apiBase = import.meta.env.VITE_API_URL || '';
    if (apiBase.startsWith('http')) {
      try {
        const apiOrigin = new URL(apiBase).origin;
        return `${apiOrigin}${rawUrl}`;
      } catch {
        // fallback
      }
    }
  }

  return rawUrl;
}

/**
 * Formats Issuing Authority to ensure both English and Arabic names are displayed.
 * e.g., "شركة ملاذ للتأمين" -> "Malath Insurance (شركة ملاذ للتأمين)"
 */
export function formatBilingualAuthority(raw: string | null | undefined): string {
  if (!raw) return 'Saudi Regulatory Authority';
  const text = raw.trim();
  const lower = text.toLowerCase();

  // Standard Saudi Transport Authorities Mappings
  if (text.includes('المرور') || lower.includes('traffic')) return 'Saudi Traffic Dept (المرور)';
  if (text.includes('الهيئة العامة للنقل') || lower.includes('transport general authority') || text.includes('TGA')) return 'Transport General Authority (الهيئة العامة للنقل)';
  if (text.includes('مركز سلامة المركبات') || lower.includes('vehicles safety center')) return 'Vehicles Safety Center (مركز سلامة المركبات)';
  if (text.includes('ملاذ') || lower.includes('malath')) return 'Malath Insurance (شركة ملاذ للتأمين)';
  if (text.includes('التعاونية') || lower.includes('tawuniya')) return 'Tawuniya Insurance (شركة التعاونية للتأمين)';
  if (text.includes('تكافل الراجحي') || lower.includes('rajhi')) return 'Al Rajhi Takaful (شركة تكافل الراجحي)';
  if (text.includes('ولاء') || lower.includes('walaa')) return 'Wala\'a Insurance (شركة ولاء للتأمين)';
  if (text.includes('ميدغلف') || lower.includes('medgulf')) return 'Medgulf Insurance (شركة ميدغلف للتأمين)';
  if (text.includes('رمز العاصمة') || lower.includes('capital symbol')) return 'Capital Symbol Motors (معرض رمز العاصمة للسيارات)';
  if (text.includes('حواجز القوة') || lower.includes('power barriers')) return 'Power Barriers Factory (مصنع حواجز القوة للصناعة)';

  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasEnglish = /[a-zA-Z]/.test(text);

  // If text already has both Arabic and English script
  if (hasArabic && hasEnglish) {
    return text;
  }

  // If pure Arabic without English, provide smart category descriptor + Arabic
  if (hasArabic && !hasEnglish) {
    if (text.includes('تأمين')) return `Insurance Co. (${text})`;
    if (text.includes('معرض') || text.includes('سيارات')) return `Motors / Showroom (${text})`;
    if (text.includes('مصنع') || text.includes('صناعة')) return `Factory / Manufacturing (${text})`;
    if (text.includes('مركز') || text.includes('سلامة')) return `Safety Center (${text})`;
    if (text.includes('هيئة') || text.includes('وزارة')) return `Saudi Authority (${text})`;
    return `Authority (${text})`;
  }

  return text;
}


