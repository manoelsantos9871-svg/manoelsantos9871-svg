import api from './api';
import { Task, PaginatedResponse, ApiResponse } from '@/types';

export const tasksService = {
  async findAll(params?: Record<string, string | number>) {
    const { data } = await api.get<PaginatedResponse<Task>>('/tasks', { params });
    return data;
  },

  async findById(id: string) {
    const { data } = await api.get<ApiResponse<Task>>(`/tasks/${id}`);
    return data.data!;
  },

  async create(payload: Record<string, unknown>) {
    const { data } = await api.post<ApiResponse<Task>>('/tasks', payload);
    return data.data!;
  },

  async update(id: string, payload: Record<string, unknown>) {
    const { data } = await api.put<ApiResponse<Task>>(`/tasks/${id}`, payload);
    return data.data!;
  },

  async updateStatus(id: string, status: string, reason?: string) {
    const { data } = await api.patch<ApiResponse<Task>>(`/tasks/${id}/status`, { status, reason });
    return data.data!;
  },

  async logTime(id: string, minutes: number, description: string, startedAt: string) {
    await api.post(`/tasks/${id}/time`, { minutes, description, startedAt });
  },

  async addComment(id: string, content: string) {
    const { data } = await api.post<ApiResponse<unknown>>(`/tasks/${id}/comments`, { content });
    return data.data!;
  },
};
