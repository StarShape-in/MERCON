import { api, ApiResponse } from '@/lib/api';

export interface ReportField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'enum' | 'money';
  aggregatable?: boolean;
  enumValues?: string[];
}

export interface ReportJoin {
  toModule: string;
  via: string;
  relationField?: string;
  cardinality?: 'one' | 'many';
}

export interface ReportModule {
  key: string;
  label: string;
  prismaModel: string;
  defaultDateField?: string;
  fields: ReportField[];
  joins: ReportJoin[];
}

export interface ReportFilter {
  field: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between';
  value: any;
}

export interface ReportValueSpec {
  field: string;
  agg: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface ReportQuerySpec {
  rootModule: string;
  rows: string[];
  columns?: string[];
  values: ReportValueSpec[];
  filters?: ReportFilter[];
  dateRange?: { start?: string; end?: string; field?: string };
  limit?: number;
}

export interface ReportResult {
  rows: Record<string, any>[];
  kpis: Record<string, number>;
  meta: { rowCount: number; truncated: boolean; connectedModules: string[] };
}

export interface SavedReport {
  id: string;
  name: string;
  category: string;
  spec: ReportQuerySpec;
  visualization: string;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReport {
  id: string;
  savedReportId: string;
  savedReport?: SavedReport;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfMonth?: number | null;
  time: string;
  recipients: string[];
  delivery: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const reportBuilderService = {
  getSchema: async (): Promise<ReportModule[]> => {
    const res = await api.get<ApiResponse<ReportModule[]>>('/report-builder/schema');
    return res.data.data;
  },

  runQuery: async (spec: ReportQuerySpec): Promise<ReportResult> => {
    const res = await api.post<ApiResponse<ReportResult>>('/report-builder/query', spec);
    return res.data.data;
  },

  listSavedReports: async (): Promise<SavedReport[]> => {
    const res = await api.get<ApiResponse<SavedReport[]>>('/report-builder/saved');
    return res.data.data;
  },

  saveReport: async (payload: {
    name: string;
    category?: string;
    spec: ReportQuerySpec;
    visualization?: string;
    isTemplate?: boolean;
  }): Promise<SavedReport> => {
    const res = await api.post<ApiResponse<SavedReport>>('/report-builder/saved', payload);
    return res.data.data;
  },

  deleteSavedReport: async (id: string): Promise<{ id: string }> => {
    const res = await api.delete<ApiResponse<{ id: string }>>(`/report-builder/saved/${id}`);
    return res.data.data;
  },

  listScheduledReports: async (): Promise<ScheduledReport[]> => {
    const res = await api.get<ApiResponse<ScheduledReport[]>>('/report-builder/scheduled');
    return res.data.data;
  },

  createScheduledReport: async (payload: {
    savedReportId: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfMonth?: number | null;
    time?: string;
    recipients?: string[];
    delivery?: string[];
    isActive?: boolean;
  }): Promise<ScheduledReport> => {
    const res = await api.post<ApiResponse<ScheduledReport>>('/report-builder/scheduled', payload);
    return res.data.data;
  },

  updateScheduledReport: async (id: string, payload: Partial<ScheduledReport>): Promise<ScheduledReport> => {
    const res = await api.put<ApiResponse<ScheduledReport>>(`/report-builder/scheduled/${id}`, payload);
    return res.data.data;
  },

  deleteScheduledReport: async (id: string): Promise<{ id: string }> => {
    const res = await api.delete<ApiResponse<{ id: string }>>(`/report-builder/scheduled/${id}`);
    return res.data.data;
  },
};
