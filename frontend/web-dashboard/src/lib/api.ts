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

/**
 * Extract human-readable, diagnostic error message from API errors (502 Bad Gateway, 500 Server, Prisma/DB, Network).
 */
export function extractApiErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';

  // If it's an Axios error or has a response
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    // 1. 502 Bad Gateway / Server Down / Proxy Failure
    if (status === 502) {
      const serverMsg = typeof responseData === 'string' ? responseData.slice(0, 150) : responseData?.message || responseData?.error?.message;
      return `502 Bad Gateway: API server is restarting or unreachable ${serverMsg ? `(${serverMsg})` : ''}`.trim();
    }

    // 2. 504 Gateway Timeout
    if (status === 504) {
      return '504 Gateway Timeout: API server took too long to respond.';
    }

    // 3. Structured JSON Error Extraction (500 / 400 / 422)
    if (responseData) {
      if (typeof responseData === 'object') {
        const msg =
          responseData.error?.message ||
          responseData.message ||
          responseData.error ||
          responseData.details ||
          (responseData.error?.code ? `Error Code: ${responseData.error.code}` : null);

        if (msg && typeof msg === 'string') {
          // Check for Prisma / Database Column & Schema Mismatches
          if (
            msg.includes('Prisma') ||
            msg.includes('P2002') ||
            msg.includes('P2025') ||
            msg.toLowerCase().includes('column') ||
            msg.toLowerCase().includes('table') ||
            msg.toLowerCase().includes('does not exist') ||
            msg.toLowerCase().includes('migration')
          ) {
            return `Database / Schema Error: ${msg}`;
          }
          return msg;
        }
      } else if (typeof responseData === 'string' && responseData.trim()) {
        const cleanedStr = responseData.replace(/<[^>]*>/g, '').slice(0, 200).trim();
        if (cleanedStr.toLowerCase().includes('prisma') || cleanedStr.toLowerCase().includes('column')) {
          return `Database Error: ${cleanedStr}`;
        }
        return cleanedStr || `Server returned HTTP ${status}`;
      }
    }

    // 4. Network Connection Refused / Offline
    if (error.code === 'ERR_NETWORK') {
      return 'Network Error: Cannot connect to API server (ERR_NETWORK). Check server status on port 3001.';
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  return 'An unexpected server error occurred.';
}

/* ─── Response interceptor — handle 401 & enrich error messages ─────────────── */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const userMessage = extractApiErrorMessage(error);
    (error as any).userMessage = userMessage;

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
