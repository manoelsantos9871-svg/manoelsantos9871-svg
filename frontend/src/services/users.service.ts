import api from './api';
import { User, PaginatedResponse, ApiResponse } from '@/types';

export const usersService = {
  async findAll(params?: Record<string, string>) {
    const { data } = await api.get<PaginatedResponse<User>>('/users', { params });
    return data;
  },

  async findById(id: string) {
    const { data } = await api.get<ApiResponse<User>>(`/users/${id}`);
    return data.data!;
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await api.post<ApiResponse<User>>('/users', payload);
    return data.data!;
  },

  async update(id: string, payload: Record<string, unknown>) {
    const { data } = await api.put<ApiResponse<User>>(`/users/${id}`, payload);
    return data.data!;
  },

  async updateStatus(id: string, status: string) {
    const { data } = await api.patch<ApiResponse<User>>(`/users/${id}/status`, { status });
    return data.data!;
  },

  async resetPassword(id: string, password: string) {
    await api.post(`/users/${id}/reset-password`, { password });
  },

  async getStats() {
    const { data } = await api.get<ApiResponse<unknown>>('/users/stats');
    return data.data;
  },
};
