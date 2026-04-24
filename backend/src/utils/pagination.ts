import { PaginationQuery, PaginatedResult } from '../types';

export function getPaginationParams(query: PaginationQuery) {
  const page = Math.max(1, parseInt(String(query.page || 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20), 10)));
  const skip = (page - 1) * limit;
  const orderBy = query.sortBy
    ? { [query.sortBy]: query.sortOrder || 'desc' }
    : { createdAt: 'desc' as const };

  return { page, limit, skip, orderBy };
}

export function buildPaginatedResult<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
