import { api } from '@/lib/api';
import type { TemplateLayout, TripReportFieldKey } from '@mercon/shared-types';

export interface InspectedColumn {
  colIndex: number;
  headerText: string;
  sampleValue: string;
  suggestedField: TripReportFieldKey | null;
}

export interface InspectedSheet {
  sheetName: string;
  headerRowIdx: number;
  dataStartRow: number;
  dataEndRow: number;
  bandSize: number;
  columns: InspectedColumn[];
}

export interface TemplateInspection {
  allSheets: string[];
  bestSheet: InspectedSheet | null;
}

export interface ReportTemplateSummary {
  id: string;
  name: string;
  source: string;
  customerId: string | null;
  customer: { name: string } | null;
  original_filename: string;
  file_size: number;
  layout: TemplateLayout;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplateFilters {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  status?: string;
  rateCategory?: string;
}

export interface TemplatePreview {
  total: number;
  rows: Record<TripReportFieldKey, unknown>[];
}

export const reportTemplateService = {
  async inspect(file: File): Promise<TemplateInspection> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/report-templates/inspect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async list(): Promise<ReportTemplateSummary[]> {
    const res = await api.get('/report-templates');
    return res.data.data;
  },

  async get(id: string): Promise<ReportTemplateSummary> {
    const res = await api.get(`/report-templates/${id}`);
    return res.data.data;
  },

  async create(params: { file: File; name: string; customerId?: string; layout: TemplateLayout }): Promise<ReportTemplateSummary> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('name', params.name);
    if (params.customerId) formData.append('customerId', params.customerId);
    formData.append('layout', JSON.stringify(params.layout));
    const res = await api.post('/report-templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async update(
    id: string,
    params: { file?: File; name?: string; customerId?: string; layout?: TemplateLayout }
  ): Promise<ReportTemplateSummary> {
    const formData = new FormData();
    if (params.file) formData.append('file', params.file);
    if (params.name !== undefined) formData.append('name', params.name);
    if (params.customerId !== undefined) formData.append('customerId', params.customerId);
    if (params.layout !== undefined) formData.append('layout', JSON.stringify(params.layout));
    const res = await api.patch(`/report-templates/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/report-templates/${id}`);
  },

  async preview(id: string, filters: ReportTemplateFilters): Promise<TemplatePreview> {
    const res = await api.post(`/report-templates/${id}/preview`, filters);
    return res.data.data;
  },

  async generate(id: string, filters: ReportTemplateFilters): Promise<Blob> {
    const res = await api.post(`/report-templates/${id}/generate`, filters, { responseType: 'blob' });
    return res.data as Blob;
  },
};
