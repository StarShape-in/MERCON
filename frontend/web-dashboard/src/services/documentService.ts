import { api, ApiResponse } from '@/lib/api';
import { MerconFolder } from './folderService';

export type DocType   = 'DriverLicense' | 'VehicleRegistration' | 'Insurance' | 'POD' | 'CustomsClearance' | 'Waybill' | 'Contract' | 'Invoice' | 'Emergency';
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

  async upload(formData: FormData): Promise<MerconDocument> {
    const res = await api.post<ApiResponse<MerconDocument>>('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async updateStatus(id: string, status: DocStatus, expiry_date?: string): Promise<MerconDocument> {
    const res = await api.patch<ApiResponse<MerconDocument>>(`/documents/${id}/status`, { status, expiry_date });
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
    const res = await api.post('/documents/bulk-download', { ids }, { responseType: 'blob' });
    return res.data as Blob;
  },

  async batchImportTruckDocs(folderPath?: string): Promise<any> {
    const res = await api.post('/documents/batch-truck-docs-local', { folderPath });
    return res.data;
  },

  async batchUploadFolder(formData: FormData): Promise<any> {
    const res = await api.post('/documents/batch-upload-folder', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
};
