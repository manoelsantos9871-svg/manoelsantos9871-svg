import api from './api';
import { Demand, PaginatedResponse, ApiResponse } from '@/types';

export const demandsService = {
  async findAll(params?: Record<string, string | number | boolean>) {
    const { data } = await api.get<PaginatedResponse<Demand>>('/demands', { params });
    return data;
  },

  async findById(id: string) {
    const { data } = await api.get<ApiResponse<Demand>>(`/demands/${id}`);
    return data.data!;
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await api.post<ApiResponse<Demand>>('/demands', payload);
    return data.data!;
  },

  async update(id: string, payload: Record<string, unknown>) {
    const { data } = await api.put<ApiResponse<Demand>>(`/demands/${id}`, payload);
    return data.data!;
  },

  async updateStatus(id: string, status: string, reason?: string) {
    const { data } = await api.patch<ApiResponse<Demand>>(`/demands/${id}/status`, { status, reason });
    return data.data!;
  },

  async addComment(id: string, content: string) {
    const { data } = await api.post<ApiResponse<unknown>>(`/demands/${id}/comments`, { content });
    return data.data!;
  },
};
