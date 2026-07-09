import { api, ApiResponse } from '@/lib/api';

export interface ReportsSummary {
  kpis: {
    total_trips:        { value: number; delta: number | null };
    active_drivers:     { value: number; delta: null };
    fleet_available:    { value: number; delta: null };
    fleet_on_trip:      { value: number; delta: null };
    revenue_this_month: { value: number; delta: number | null };
    docs_expiring_soon: { value: number; delta: null };
  };
  trip_status_distribution: Record<string, number>;
  monthly_revenue_chart: { month: string; revenue: number }[];
}

export const reportsService = {
  async getSummary(): Promise<ReportsSummary> {
    const res = await api.get<ApiResponse<ReportsSummary>>('/reports/summary');
    return res.data.data;
  },

  async getFleetPerformance(): Promise<ApiResponse<unknown[]>> {
    const res = await api.get<ApiResponse<unknown[]>>('/reports/fleet');
    return res.data;
  },

  async getDriverPerformance(): Promise<ApiResponse<unknown[]>> {
    const res = await api.get<ApiResponse<unknown[]>>('/reports/drivers');
    return res.data;
  },

  async getRevenueReport(months = 6): Promise<ApiResponse<unknown>> {
    const res = await api.get<ApiResponse<unknown>>('/reports/revenue', { params: { months } });
    return res.data;
  },
};
