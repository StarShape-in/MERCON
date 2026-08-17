import { api, ApiResponse } from '@/lib/api';

export type DocOwnerType = 'Driver' | 'Vehicle' | 'Trip' | 'Customer' | 'Company' | 'Other';
export type DocRequirement = 'MANDATORY' | 'OPTIONAL' | 'DISABLED';

export interface DocumentType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  ownerType: DocOwnerType;
  requirementStatus: DocRequirement;
  isActive: boolean;
  displayOrder: number;
  requiresIssueDate: boolean;
  requiresExpiryDate: boolean;
  allowsMultipleFiles: boolean;
  allowedFileTypes: string[];
  document_count?: number;
}

export interface DocumentTypePayload {
  code?: string;
  name: string;
  description?: string | null;
  ownerType: DocOwnerType;
  requirementStatus: DocRequirement;
  isActive?: boolean;
  displayOrder?: number;
  requiresIssueDate?: boolean;
  requiresExpiryDate?: boolean;
  allowsMultipleFiles?: boolean;
  allowedFileTypes?: string[];
}

export const documentTypeService = {
  async getAll(filters: { ownerType?: DocOwnerType; isActive?: boolean } = {}): Promise<ApiResponse<DocumentType[]>> {
    const res = await api.get<ApiResponse<DocumentType[]>>('/document-types', { params: filters });
    return res.data;
  },

  async create(payload: DocumentTypePayload): Promise<DocumentType> {
    const res = await api.post<ApiResponse<DocumentType>>('/document-types', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<DocumentTypePayload>): Promise<DocumentType> {
    const res = await api.patch<ApiResponse<DocumentType>>(`/document-types/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/document-types/${id}`);
  },
};
