import api from './api';
import { ServiceOrder, PaginatedResponse, ApiResponse } from '@/types';

export const serviceOrdersService = {
  async findAll(params?: Record<string, string>) {
    const { data } = await api.get<PaginatedResponse<ServiceOrder>>('/service-orders', { params });
    return data;
  },

  async findById(id: string) {
    const { data } = await api.get<ApiResponse<ServiceOrder>>(`/service-orders/${id}`);
    return data.data!;
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await api.post<ApiResponse<ServiceOrder>>('/service-orders', payload);
    return data.data!;
  },

  async update(id: string, payload: Record<string, unknown>) {
    const { data } = await api.put<ApiResponse<ServiceOrder>>(`/service-orders/${id}`, payload);
    return data.data!;
  },

  async updateStatus(id: string, status: string) {
    const { data } = await api.patch<ApiResponse<ServiceOrder>>(`/service-orders/${id}/status`, { status });
    return data.data!;
  },

  async updateChecklist(id: string, checklistId: string, completed: boolean) {
    const { data } = await api.patch<ApiResponse<unknown>>(`/service-orders/${id}/checklists/${checklistId}`, { completed });
    return data.data!;
  },
};
