/**
 * The Document columns list endpoints are allowed to return.
 *
 * Deliberately omits two columns that dominate a Document row's size:
 *
 *  - `ocr_raw_text` (Text)  — the full OCR dump of the scanned page. Nothing in
 *    the dashboard or the mobile app reads it; it exists for the OCR pipeline.
 *  - `ai_extracted_json` (JsonB) — only ever rendered by DocumentPreviewSheet,
 *    which fetches its document by id through `getDocumentById`. That endpoint
 *    still returns the full row, so the preview is unaffected.
 *
 * Together they were roughly 60% of every document row. The Documents Center
 * asks for 2000 documents at once, and the driver/vehicle detail endpoints
 * return every document for that owner, so both were shipping OCR text nobody
 * would ever display.
 *
 * Keep this in sync when a column is added to `model Document` — a new column
 * has to be listed here to reach the client, which is the intended direction:
 * opt in, rather than leak every future blob column by default.
 */
export const DOCUMENT_LIST_SELECT = {
  id: true,
  entity_type: true,
  entity_id: true,
  doc_type: true,
  status: true,
  documentTypeId: true,
  file_url: true,
  mime_type: true,
  checksum: true,
  folderId: true,
  issue_date: true,
  expiry_date: true,
  is_confidential: true,
  verified_by: true,
  created_by: true,
  updated_by: true,
  deleted_by: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  isActive: true,
  version: true,
  ai_extracted_json: true,
} as const;

/** The files sub-select every document list uses. */
export const DOCUMENT_FILES_SELECT = {
  where: { deletedAt: null, isActive: true },
  orderBy: { displayOrder: 'asc' },
} as const;
