import { api, ApiResponse } from '@/lib/api';
import type { PublicSettings, Settings } from '@mercon/shared-types';

export const settingsService = {
  async getPublic(): Promise<PublicSettings> {
    const res = await api.get<ApiResponse<PublicSettings>>('/settings/public');
    return res.data.data;
  },

  async get(): Promise<Settings> {
    const res = await api.get<ApiResponse<Settings>>('/settings');
    return res.data.data;
  },

  async update(payload: Partial<Pick<Settings, 'appName' | 'companyLegalName' | 'logoUrl' | 'primaryColor' | 'enabledModules'>>): Promise<Settings> {
    const res = await api.put<ApiResponse<Settings>>('/settings', payload);
    return res.data.data;
  },

  /** Uploads a logo file via the generic upload endpoint, returning its URL to save via update(). */
  async uploadLogo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiResponse<{ file_url: string }>>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.file_url;
  },
};
