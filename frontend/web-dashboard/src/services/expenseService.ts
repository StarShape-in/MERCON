import { api, ApiResponse } from '@/lib/api';

export type ExpenseStatus = 'Paid' | 'Pending';

export interface Expense {
  id: string;
  /** Sequential expense number, e.g. "EXP-001". Null only for un-backfilled rows. */
  ref_id?: string | null;
  category: string;
  status: ExpenseStatus;
  driverId?: string | null;
  vehicleId?: string | null;
  payee?: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  payment_method?: string | null;
  description?: string | null;
  /** When the vendor's bill was issued — distinct from expense_date. */
  bill_issued_date?: string | null;
  /** When the bill was actually paid — set once the record is settled. */
  bill_paid_date?: string | null;
  createdAt: string;
  updatedAt: string;
  driver?: {
    id: string;
    first_name: string;
    last_name: string;
    ref_id: string | null;
  } | null;
  vehicle?: {
    id: string;
    plate_number: string;
    ref_id: string | null;
  } | null;
}

export interface CreateExpensePayload {
  category: string;
  status?: ExpenseStatus;
  driver_id?: string | null;
  vehicle_id?: string | null;
  payee?: string;
  amount: number;
  currency?: string;
  expense_date?: string;
  payment_method?: string;
  description?: string;
  bill_issued_date?: string | null;
  bill_paid_date?: string | null;
}

export interface UpdateExpensePayload extends Partial<CreateExpensePayload> {}

export interface ExpenseFilters {
  category?: string;
  status?: string;
  driver_id?: string;
  vehicle_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface ExpenseKpis {
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  salary_amount: number;
  total_count: number;
}

export interface ExpenseListResponse {
  success: boolean;
  data: Expense[];
  kpis?: ExpenseKpis;
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export const expenseService = {
  async getAll(filters: ExpenseFilters = {}): Promise<ExpenseListResponse> {
    const res = await api.get<ExpenseListResponse>('/expenses', { params: filters });
    return res.data;
  },

  async getById(id: string): Promise<Expense> {
    const res = await api.get<ApiResponse<Expense>>(`/expenses/${id}`);
    return res.data.data;
  },

  async create(payload: CreateExpensePayload): Promise<Expense> {
    const res = await api.post<ApiResponse<Expense>>('/expenses', payload);
    return res.data.data;
  },

  async update(id: string, payload: UpdateExpensePayload): Promise<Expense> {
    const res = await api.patch<ApiResponse<Expense>>(`/expenses/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/expenses/${id}`);
  },
};
