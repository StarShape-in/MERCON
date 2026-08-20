import { api, ApiResponse } from '@/lib/api';
import type { ImportSummary } from '@/components/fleet/ExcelImportDialog';

export interface Customer {
  id: string;
  name: string;
  contact_phone: string;
  phone?: string;
  avatar_url?: string | null;
  logo_url?: string | null;
  whatsapp_number?: string;
  whatsapp_group_link?: string;
  whatsapp_group_name?: string;
  company_name?: string;
  primary_contact_person?: string;
  primary_contact_phone?: string;
  secondary_contact_person?: string;
  secondary_contact_phone?: string;
  payment_terms?: string;
  tax_number?: string;
  credit_limit: number;
  isActive: boolean;
  createdAt: string;
  default_pickup_lat?: number | null;
  default_pickup_lng?: number | null;
  default_dropoff_lat?: number | null;
  default_dropoff_lng?: number | null;
  trips?: { id: string; ref_id: string; status: string; createdAt: string }[];
  /** Present on list responses only — total trip count, used to rank frequent shippers. */
  _count?: { trips: number };
}

export interface CreateCustomerPayload {
  name: string;
  contact_phone: string;
  company_name?: string;
  avatar_url?: string | null;
  logo_url?: string | null;
  primary_contact_person?: string;
  primary_contact_phone?: string;
  secondary_contact_person?: string;
  secondary_contact_phone?: string;
  payment_terms?: string;
  tax_number?: string;
  credit_limit?: number;
  isActive?: boolean;
  whatsapp_number?: string;
  whatsapp_group_link?: string;
  whatsapp_group_name?: string;
  default_pickup_lat?: number | null;
  default_pickup_lng?: number | null;
  default_dropoff_lat?: number | null;
  default_dropoff_lng?: number | null;
}

export interface CustomerFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  per_page?: number;
  /** Light "picker" shape — scalars only, no per-row trip count. */
  mode?: 'lookup';
}

export const customerService = {
  async getAll(filters: CustomerFilters = {}): Promise<ApiResponse<Customer[]>> {
    const res = await api.get<ApiResponse<Customer[]>>('/customers', { params: filters });
    return res.data;
  },

  async getById(id: string): Promise<Customer> {
    const res = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
    return res.data.data;
  },

  async create(payload: CreateCustomerPayload): Promise<Customer> {
    const res = await api.post<ApiResponse<Customer>>('/customers', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<CreateCustomerPayload>): Promise<Customer> {
    const res = await api.patch<ApiResponse<Customer>>(`/customers/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },

  // 120s matches nginx's proxy_read_timeout for /api — a large sheet takes far
  // longer server-side than the client's default 15s request timeout allows.
  async importRows(rows: Record<string, string | number>[]): Promise<ImportSummary> {
    const res = await api.post<ApiResponse<ImportSummary>>('/customers/import', { rows }, { timeout: 120_000 });
    return res.data.data;
  },
};
