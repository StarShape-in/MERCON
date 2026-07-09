import { api, ApiResponse } from '@/lib/api';
import { authStore, AuthUser } from '@/store/authStore';

export interface LoginPayload {
  email: string;
  password: string;
}
export interface LoginResult {
  token: string;
  expires_at: string;
  user: AuthUser;
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    const res = await api.post<ApiResponse<LoginResult>>('/auth/operator/login', payload);
    const { token, user } = res.data.data;
    authStore.setSession(token, user);
    return res.data.data;
  },

  async getMe(): Promise<AuthUser> {
    const res = await api.get<ApiResponse<AuthUser>>('/auth/me');
    return res.data.data;
  },

  logout() {
    authStore.clearSession();
    window.location.href = '/login';
  },
};
