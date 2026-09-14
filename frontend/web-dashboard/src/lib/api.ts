import axios, { AxiosError } from 'axios';
import { authStore } from '@/store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

/* ─── Request interceptor — attach JWT ─────────────────────────────────────── */
api.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ─── Response interceptor — handle 401 ────────────────────────────────────── */
// 401 = token expired / revoked: clear the session and redirect to login.
// 403 = authenticated but not authorised: do NOT redirect — let the calling
//       page handle it inline. RequireModule already blocks gated pages
//       client-side, so a MODULE_DISABLED 403 on a background query must
//       never redirect the user away from the page they are on.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const errCode = error.response?.data?.error?.code;
    const errMsg = (error.response?.data?.error?.message || '').toLowerCase();
    const isTokenErr =
      error.response?.status === 401 ||
      errCode === 'INVALID_TOKEN' ||
      errCode === 'UNAUTHORIZED' ||
      errCode === 'TOKEN_EXPIRED' ||
      errMsg.includes('expired token') ||
      errMsg.includes('invalid token') ||
      errMsg.includes('token missing');

    if (isTokenErr) {
      authStore.clearSession();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // MODULE_DISABLED: do NOT redirect here. Background queries (documents,
    // reports) can return MODULE_DISABLED on dashboards/trip-detail pages
    // that are not themselves gated — redirecting would bounce the user away
    // from unrelated pages. RequireModule handles route-level gating.
    return Promise.reject(error);
  }
);

/* ─── Typed response wrapper ────────────────────────────────────────────────── */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
