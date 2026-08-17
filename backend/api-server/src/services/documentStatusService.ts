// Single source of truth for a document's compliance status. Both the
// owner-folder endpoint (documentController.getOwnerFolder) and any future
// caller must go through this rather than re-deriving it — see the
// Documents Center redesign in PROGRESS.md, spec requirement "centralize the
// status logic".

export type DocComplianceStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';

const EXPIRING_SOON_WINDOW_DAYS = 30;

/**
 * Status for a document that exists (a file was uploaded). A document type
 * that doesn't require an expiry date never expires.
 */
export function computeDocumentStatus(
  expiryDate: Date | null,
  requiresExpiryDate: boolean,
): DocComplianceStatus {
  if (!requiresExpiryDate || !expiryDate) return 'VALID';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const daysLeft = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);

  if (daysLeft < 0) return 'EXPIRED';
  if (daysLeft <= EXPIRING_SOON_WINDOW_DAYS) return 'EXPIRING_SOON';
  return 'VALID';
}
