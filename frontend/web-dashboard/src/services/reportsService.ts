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

export interface RevenueReport {
  monthly_breakdown: { month: string; revenue: number; count: number }[];
  total_all_time: number;
  outstanding_total: number;
  paid_invoice_count: number;
  avg_per_invoice: number;
  top_customers: { name: string; value: number }[];
}

export interface FleetPerfRow {
  id: string;
  ref_id: string | null;
  plate_number: string;
  status: string;
  total_trips: number;
  completed_trips: number;
  odometer: number | null;
  maintenance_cost: number;
}

export interface DriverPerfRow {
  id: string;
  ref_id: string | null;
  name: string;
  status: string;
  total_trips: number;
  completed_trips: number;
  ai_risk_score: number | null;
}

export interface CustomReportFilters {
  startDate?: string;
  endDate?: string;
  customerId?: string;
}

export interface CustomReportData {
  kpis: {
    total_trips: number;
    total_revenue: number;
  };
  trip_status_distribution: Record<string, number>;
  trips: {
    id: string;
    ref_id: string;
    customer: string;
    driver: string;
    vehicle: string;
    status: string;
    date: string;
  }[];
}

export const reportsService = {
  async getSummary(): Promise<ReportsSummary> {
    const res = await api.get<ApiResponse<ReportsSummary>>('/reports/summary');
    return res.data.data;
  },

  async getFleetPerformance(): Promise<FleetPerfRow[]> {
    const res = await api.get<ApiResponse<FleetPerfRow[]>>('/reports/fleet');
    return res.data.data;
  },

  async getDriverPerformance(): Promise<DriverPerfRow[]> {
    const res = await api.get<ApiResponse<DriverPerfRow[]>>('/reports/drivers');
    return res.data.data;
  },

  async getRevenueReport(months = 6): Promise<RevenueReport> {
    const res = await api.get<ApiResponse<RevenueReport>>('/reports/revenue', { params: { months } });
    return res.data.data;
  },

  async getCustomReport(filters: CustomReportFilters): Promise<CustomReportData> {
    const res = await api.get<ApiResponse<CustomReportData>>('/reports/custom', { params: filters });
    return res.data.data;
  },
};
