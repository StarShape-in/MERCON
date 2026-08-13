import { api, ApiResponse } from '@/lib/api';

export interface MerconFolder {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  color: string | null;
  document_count?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderPayload {
  name: string;
  category?: string;
  description?: string;
  color?: string;
}

export const folderService = {
  async getAll(category?: string): Promise<ApiResponse<MerconFolder[]>> {
    const res = await api.get<ApiResponse<MerconFolder[]>>('/folders', {
      params: category ? { category } : {}
    });
    return res.data;
  },

  async create(payload: CreateFolderPayload): Promise<MerconFolder> {
    const res = await api.post<ApiResponse<MerconFolder>>('/folders', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<CreateFolderPayload>): Promise<MerconFolder> {
    const res = await api.patch<ApiResponse<MerconFolder>>(`/folders/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/folders/${id}`);
  }
};
