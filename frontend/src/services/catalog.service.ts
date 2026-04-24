import api from './api';
import { Unit, Category, SLAConfig, ApiResponse } from '@/types';

export const catalogService = {
  async getUnits() {
    const { data } = await api.get<ApiResponse<Unit[]>>('/catalog/units');
    return data.data!;
  },

  async createUnit(payload: Record<string, string>) {
    const { data } = await api.post<ApiResponse<Unit>>('/catalog/units', payload);
    return data.data!;
  },

  async getCategories() {
    const { data } = await api.get<ApiResponse<Category[]>>('/catalog/categories');
    return data.data!;
  },

  async createCategory(payload: Record<string, string>) {
    const { data } = await api.post<ApiResponse<Category>>('/catalog/categories', payload);
    return data.data!;
  },

  async getSlaConfigs() {
    const { data } = await api.get<ApiResponse<SLAConfig[]>>('/sla');
    return data.data!;
  },

  async upsertSla(payload: Record<string, unknown>) {
    const { data } = await api.post<ApiResponse<SLAConfig>>('/sla', payload);
    return data.data!;
  },

  async deleteSla(id: string) {
    await api.delete(`/sla/${id}`);
  },

  async getSlaStats() {
    const { data } = await api.get<ApiResponse<unknown>>('/sla/stats');
    return data.data;
  },

  async getAuditLogs(params?: Record<string, string>) {
    const { data } = await api.get('/audit', { params });
    return data;
  },
};
