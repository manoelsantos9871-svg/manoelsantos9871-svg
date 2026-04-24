import api from './api';
import { ApiResponse, User } from '@/types';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; requiresMfa?: boolean; userId?: string }>>('/auth/login', { email, password });
    return data.data!;
  },

  async verifyMfa(userId: string, token: string) {
    const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/mfa/verify', { userId, token });
    return data.data!;
  },

  async getMe() {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data.data!;
  },

  async logout(refreshToken: string) {
    await api.post('/auth/logout', { refreshToken });
  },

  async refreshToken(refreshToken: string) {
    const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken });
    return data.data!;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    await api.put('/auth/password', { currentPassword, newPassword });
  },

  async setupMfa() {
    const { data } = await api.post<ApiResponse<{ secret: string; qrCode: string }>>('/auth/mfa/setup');
    return data.data!;
  },

  async enableMfa(token: string) {
    const { data } = await api.post<ApiResponse<{ mfaEnabled: boolean }>>('/auth/mfa/enable', { token });
    return data.data!;
  },

  async disableMfa() {
    const { data } = await api.delete<ApiResponse<{ mfaEnabled: boolean }>>('/auth/mfa');
    return data.data!;
  },
};
