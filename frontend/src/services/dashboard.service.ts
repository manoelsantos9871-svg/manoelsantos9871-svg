import api from './api';
import { ApiResponse, DashboardOverview } from '@/types';

export const dashboardService = {
  async getOverview() {
    const { data } = await api.get<ApiResponse<DashboardOverview>>('/dashboard/overview');
    return data.data!;
  },

  async getDemandsByStatus() {
    const { data } = await api.get<ApiResponse<Array<{ status: string; _count: { status: number } }>>>('/dashboard/demands-by-status');
    return data.data!;
  },

  async getDemandsByType() {
    const { data } = await api.get<ApiResponse<Array<{ type: string; _count: { type: number } }>>>('/dashboard/demands-by-type');
    return data.data!;
  },

  async getDemandsByPriority() {
    const { data } = await api.get<ApiResponse<Array<{ priority: string; _count: { priority: number } }>>>('/dashboard/demands-by-priority');
    return data.data!;
  },

  async getVolumeByPeriod(days = 30) {
    const { data } = await api.get<ApiResponse<Array<{ date: string; total: number; closed: number }>>>('/dashboard/volume', { params: { days } });
    return data.data!;
  },

  async getTopTechnicians() {
    const { data } = await api.get<ApiResponse<Array<{ id: string; name: string; resolved: number }>>>('/dashboard/top-technicians');
    return data.data!;
  },

  async getAvgResolutionTime() {
    const { data } = await api.get<ApiResponse<{ overall: number; byType: Array<{ type: string; avgMinutes: number }> }>>('/dashboard/avg-resolution-time');
    return data.data!;
  },
};
