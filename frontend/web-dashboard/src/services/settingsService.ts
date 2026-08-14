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
};
