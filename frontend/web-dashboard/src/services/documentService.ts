import { api, ApiResponse } from '@/lib/api';
import { MerconFolder } from './folderService';
import type { DocumentType, DocOwnerType } from './documentTypeService';

export type DocType   = 'DriverLicense' | 'VehicleRegistration' | 'Insurance' | 'POD' | 'CustomsClearance' | 'Waybill' | 'Contract' | 'Invoice' | 'Emergency' | 'Passport' | 'CustomerDoc' | 'CommercialRegistration';
export type DocStatus = 'PendingReview' | 'Verified' | 'Rejected' | 'Expired';

export interface MerconDocument {
  id: string;
  entity_type: string;
  entity_id: string;
  doc_type: DocType;
  status: DocStatus;
  file_url: string;
  mime_type: string | null;
  folderId?: string | null;
  folder?: MerconFolder | null;
  issue_date: string | null;
  expiry_date: string | null;
  ocr_raw_text?: string | null;
  ai_extracted_json?: {
    document_number?: string | null;
    vehicle_plate?: string | null;
    issuing_authority?: string | null;
    extra_details?: Record<string, any> | null;
    notes?: string | null;
    confidence?: number;
  } | null;
  is_confidential: boolean;
  isActive: boolean;
  createdAt: string;
  documentTypeId?: string | null;
  documentType?: DocumentType | null;
  files?: Array<{ id: string; file_url: string; mime_type: string | null; label: string | null }>;
}

export type DocComplianceStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';

export interface OwnerFolderSlot {
  documentType: DocumentType;
  document: MerconDocument | null;
  status: DocComplianceStatus;
}

export interface OwnerFolder {
  ownerType: DocOwnerType;
  ownerId: string;
  ownerName: string;
  avatar_url?: string | null;
  mandatoryTotal: number;
  mandatoryComplete: number;
  slots: OwnerFolderSlot[];
}

export interface OwnerFoldersSummarySlot {
  documentTypeId: string;
  code: string;
  name: string;
  expiry_date: string | null;
  documentId: string | null;
  status: DocComplianceStatus;
}

export interface OwnerFoldersSummaryRow {
  ownerType: 'Driver' | 'Vehicle';
  ownerId: string;
  ownerName: string;
  ownerRef: string | null;
  avatar_url?: string | null;
  relatedName: string | null;
  mandatoryTotal: number;
  mandatoryComplete: number;
  slots: OwnerFoldersSummarySlot[];
}

/* ─── Staged import ────────────────────────────────────────────────────────── */

export type ImportItemStatus = 'Pending' | 'Analyzing' | 'Ready' | 'NeedsInput' | 'Unrecognised' | 'Confirmed' | 'Skipped' | 'Failed';
export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface DocumentImportItem {
  id: string;
  filename: string;
  file_url: string;
  mime_type: string | null;
  status: ImportItemStatus;
  ownerType: 'Driver' | 'Vehicle' | null;
  ownerId: string | null;
  ownerName: string | null;
  documentType: { id: string; name: string; code: string; ownerType: string; allowsMultipleFiles: boolean } | null;
  confidence: MatchConfidence | null;
  reason: string | null;
  /** What the AI thinks the file is, even when it matches no configured type. */
  detectedKind: string | null;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  issuing_authority: string | null;
  duplicateOfDocumentId: string | null;
  duplicateExpiry: string | null;
  error: string | null;
  createdDocumentId: string | null;
}

export interface DocumentImport {
  id: string;
  items: DocumentImportItem[];
  analyzing: number;
  isComplete: boolean;
  counts: {
    total: number;
    ready: number;
    needsInput: number;
    unrecognised: number;
    failed: number;
    confirmed: number;
    duplicates: number;
  };
}

export interface ImportItemPatch {
  ownerType?: 'Driver' | 'Vehicle' | null;
  ownerId?: string | null;
  documentTypeId?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  document_number?: string | null;
  status?: 'Skipped';
}

export interface ConfirmImportResult {
  created: number;
  replaced: number;
  filesAdded: number;
  skipped: number;
  blocked: Array<{ id: string; reason: string }>;
  remaining: number;
}

export interface DocumentFilters {
  entity_type?: string;
  entity_id?: string;
  doc_type?: DocType;
  status?: DocStatus;
  expiring_within_days?: number;
  folder_id?: string | null;
  page?: number;
  per_page?: number;
}

export const documentService = {
  async getAll(filters: DocumentFilters = {}): Promise<ApiResponse<MerconDocument[]>> {
    const res = await api.get<ApiResponse<MerconDocument[]>>('/documents', { params: filters });
    return res.data;
  },

  async getById(id: string): Promise<MerconDocument> {
    const res = await api.get<ApiResponse<MerconDocument>>(`/documents/${id}`);
    return res.data.data;
  },

  async upload(formData: FormData, onUploadProgress?: (progressEvent: any) => void): Promise<MerconDocument> {
    // File transfers routinely take longer than the API client's default 15s
    // JSON-request timeout — a multi-MB PDF/photo through the production
    // nginx+Docker hop can easily exceed that and abort with a client-side
    // timeout even though the upload would have succeeded given more time.
    const res = await api.post<ApiResponse<MerconDocument>>('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
      onUploadProgress,
    });
    return res.data.data;
  },

  async addFile(id: string, file: File, label?: string, onUploadProgress?: (progressEvent: any) => void): Promise<MerconDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (label) formData.append('label', label);
    const res = await api.post<ApiResponse<MerconDocument>>(`/documents/${id}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
      onUploadProgress,
    });
    return res.data.data;
  },

  async updateStatus(id: string, status: DocStatus, expiry_date?: string): Promise<MerconDocument> {
    const res = await api.patch<ApiResponse<MerconDocument>>(`/documents/${id}/status`, { status, expiry_date });
    return res.data.data;
  },

  async updateDates(id: string, dates: { issue_date?: string | null; expiry_date?: string | null }): Promise<MerconDocument> {
    const res = await api.patch<ApiResponse<MerconDocument>>(`/documents/${id}/status`, dates);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post('/documents/bulk-delete', { ids });
  },

  async bulkUpdateStatus(ids: string[], status: string): Promise<void> {
    await api.post('/documents/bulk-update-status', { ids, status });
  },

  async bulkMoveToFolder(ids: string[], folderId: string | null): Promise<void> {
    await api.post('/documents/bulk-move', { ids, folder_id: folderId });
  },

  async bulkDownloadZip(ids: string[]): Promise<Blob> {
    const res = await api.post('/documents/bulk-download', { ids }, { responseType: 'blob', timeout: 120_000 });
    return res.data as Blob;
  },

  async batchImportTruckDocs(folderPath?: string): Promise<any> {
    const res = await api.post('/documents/batch-truck-docs-local', { folderPath });
    return res.data;
  },

  async batchUploadFolder(formData: FormData): Promise<any> {
    const res = await api.post('/documents/batch-upload-folder', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    });
    return res.data;
  },

  async uploadRawChunk(payload: { filename: string; chunk: string; isFirst: boolean; isLast: boolean; cleanId?: string }): Promise<any> {
    const res = await api.post('/documents/upload-raw-chunk', payload);
    return res.data;
  },

  async bulkOcrExtract(onlyMissingExpiry = true, limit = 200, ids?: string[]): Promise<any> {
    const res = await api.post('/documents/bulk-ocr-extract', {
      only_missing_expiry: ids && ids.length > 0 ? false : onlyMissingExpiry,
      limit,
      ids,
    });
    return res.data;
  },

  async extractDocumentOcr(id: string): Promise<any> {
    const res = await api.post(`/documents/${id}/ocr-extract`);
    return res.data;
  },

  async autoAssignUnlinked(): Promise<any> {
    const res = await api.post('/documents/auto-assign-unlinked');
    return res.data;
  },

  async previewAutoAssign(): Promise<any> {
    const res = await api.get('/documents/preview-auto-assign');
    return res.data;
  },

  async confirmAutoAssign(assignments: Array<{ docId: string; entityType: string; entityId: string }>): Promise<any> {
    const res = await api.post('/documents/confirm-auto-assign', { assignments });
    return res.data;
  },

  async getOwnerFolder(ownerType: DocOwnerType | string, ownerId: string): Promise<OwnerFolder> {
    const res = await api.get<ApiResponse<OwnerFolder>>('/documents/owner-folder', { params: { ownerType, ownerId } });
    return res.data.data;
  },

  async getOwnerFolders(ownerType: 'Driver' | 'Vehicle'): Promise<OwnerFoldersSummaryRow[]> {
    const res = await api.get<ApiResponse<OwnerFoldersSummaryRow[]>>('/documents/owner-folders', { params: { ownerType } });
    return res.data.data;
  },

  async deleteFile(documentId: string, fileId: string): Promise<void> {
    await api.delete(`/documents/${documentId}/files/${fileId}`);
  },

  /* ─── Staged import pipeline ─────────────────────────────────────────────
   * Files are uploaded here, read by AI, reviewed, and only become real
   * Documents on confirm — nothing unowned ever reaches the vault. */

  async createImport(files: File[], ownerType?: string, ownerId?: string): Promise<{ id: string; itemCount: number }> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    if (ownerType) formData.append('ownerType', ownerType);
    if (ownerId) formData.append('ownerId', ownerId);
    const res = await api.post<ApiResponse<{ id: string; itemCount: number }>>('/documents/imports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000, // a large batch is a long single upload
    });
    return res.data.data;
  },

  async getImport(id: string): Promise<DocumentImport> {
    const res = await api.get<ApiResponse<DocumentImport>>(`/documents/imports/${id}`);
    return res.data.data;
  },

  async analyzeImport(id: string, itemIds?: string[]): Promise<{ importId: string; count: number; message: string }> {
    const res = await api.post<ApiResponse<{ importId: string; count: number; message: string }>>(`/documents/imports/${id}/analyze`, { itemIds });
    return res.data.data;
  },

  async listImports(): Promise<Array<{ id: string; createdAt: string; total: number; pending: number }>> {
    const res = await api.get<ApiResponse<Array<{ id: string; createdAt: string; total: number; pending: number }>>>('/documents/imports');
    return res.data.data;
  },

  async updateImportItem(importId: string, itemId: string, patch: ImportItemPatch): Promise<any> {
    const res = await api.patch(`/documents/imports/${importId}/items/${itemId}`, patch);
    return res.data.data;
  },

  async confirmImport(
    importId: string,
    itemIds: string[],
    duplicateActions?: Record<string, 'replace' | 'addFile' | 'skip'>,
  ): Promise<ConfirmImportResult> {
    const res = await api.post<ApiResponse<ConfirmImportResult>>(
      `/documents/imports/${importId}/confirm`,
      { itemIds, duplicateActions },
      { timeout: 120_000 },
    );
    return res.data.data;
  },

  async discardImport(id: string): Promise<void> {
    await api.delete(`/documents/imports/${id}`);
  },

  async analyzeAgreement(id: string): Promise<{
    agreement_ref: string | null;
    valid_from: string | null;
    valid_to: string | null;
    payment_terms: string | null;
    conditions: string | null;
    routes: Array<{
      origin_name: string;
      destination_name: string;
      vehicle_class: string;
      line_type: string;
      billing_rate: number;
      driver_charge?: number | null;
    }>;
    confidence: number;
    notes?: string | null;
  }> {
    const res = await api.post<ApiResponse<any>>(`/documents/${id}/analyze-agreement`);
    return res.data.data;
  },
};
