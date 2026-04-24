import { SOStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../utils/errors';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { PaginationQuery } from '../types';

interface SOFilters extends PaginationQuery {
  status?: SOStatus;
  demandId?: string;
  executorId?: string;
}

const SO_INCLUDE = {
  demand: { select: { id: true, number: true, title: true } },
  executor: { select: { id: true, name: true, email: true } },
  checklists: { orderBy: { sortOrder: 'asc' as const } },
};

async function generateSONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.serviceOrder.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `OS-${year}-${String(count + 1).padStart(5, '0')}`;
}

export class ServiceOrdersService {
  async findAll(filters: SOFilters) {
    const { page, limit, skip, orderBy } = getPaginationParams(filters);
    const where: Record<string, unknown> = {};

    if (filters.status) where.status = filters.status;
    if (filters.demandId) where.demandId = filters.demandId;
    if (filters.executorId) where.executorId = filters.executorId;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { number: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.serviceOrder.findMany({ where, skip, take: limit, orderBy, include: SO_INCLUDE }),
      prisma.serviceOrder.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string) {
    const so = await prisma.serviceOrder.findUnique({ where: { id }, include: SO_INCLUDE });
    if (!so) throw new NotFoundError('Ordem de Serviço');
    return so;
  }

  async create(data: {
    demandId: string;
    title: string;
    description: string;
    executorId?: string;
    checklists?: string[];
  }) {
    const number = await generateSONumber();
    const { checklists, ...rest } = data;

    return prisma.serviceOrder.create({
      data: {
        ...rest,
        number,
        checklists: checklists?.length
          ? { create: checklists.map((item, idx) => ({ item, sortOrder: idx })) }
          : undefined,
      },
      include: SO_INCLUDE,
    });
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    executorId: string;
    notes: string;
    startDate: Date;
    endDate: Date;
    signature: string;
  }>) {
    await this.findById(id);
    return prisma.serviceOrder.update({ where: { id }, data, include: SO_INCLUDE });
  }

  async updateStatus(id: string, status: SOStatus) {
    await this.findById(id);
    const data: Record<string, unknown> = { status };
    if (status === 'IN_PROGRESS') data.startDate = new Date();
    if (status === 'COMPLETED') data.endDate = new Date();
    return prisma.serviceOrder.update({ where: { id }, data, include: SO_INCLUDE });
  }

  async updateChecklist(id: string, checklistId: string, completed: boolean) {
    await this.findById(id);
    return prisma.sOChecklist.update({
      where: { id: checklistId },
      data: { completed, completedAt: completed ? new Date() : null },
    });
  }
}

export const serviceOrdersService = new ServiceOrdersService();
