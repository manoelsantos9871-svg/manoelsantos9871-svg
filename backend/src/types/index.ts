import { UserRole } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export type DemandFilters = {
  type?: string;
  status?: string;
  priority?: string;
  unitId?: string;
  categoryId?: string;
  assignedToId?: string;
  createdById?: string;
  slaBreached?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

export type TaskFilters = {
  status?: string;
  assignedToId?: string;
  demandId?: string;
  dateFrom?: string;
  dateTo?: string;
};
