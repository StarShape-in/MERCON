/**
 * API client for the MERCON backend.
 * Base URL comes from EXPO_PUBLIC_API_URL (set in .env or eas.json),
 * falling back to the production server.
 */
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://mercon.tech/api';

export const TOKEN_KEY = 'mercon_token';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Attach the saved JWT to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Standard error envelope from the backend: { success: false, error: { code, message } } */
export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.data?.error?.message) return err.response.data.error.message;
    if (err.code === 'ECONNABORTED') return 'Request timed out. Check your connection.';
    if (!err.response) return 'Cannot reach the server. Check your connection.';
  }
  return 'Something went wrong. Please try again.';
}
