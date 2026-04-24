import { DemandStatus, DemandType, Priority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../utils/errors';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { DemandFilters, PaginationQuery } from '../types';
import { slaService } from './sla.service';

type DemandQuery = DemandFilters & PaginationQuery;

const DEMAND_INCLUDE = {
  unit: { select: { id: true, name: true, code: true } },
  category: { select: { id: true, name: true, color: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  _count: { select: { tasks: true, comments: true, attachments: true } },
};

async function generateDemandNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.demand.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  return `DEM-${year}-${String(count + 1).padStart(5, '0')}`;
}

export class DemandsService {
  async findAll(filters: DemandQuery) {
    const { page, limit, skip, orderBy } = getPaginationParams(filters);
    const where: Record<string, unknown> = {};

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.unitId) where.unitId = filters.unitId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.slaBreached !== undefined) where.slaBreached = filters.slaBreached;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
        ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
      };
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { number: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.demand.findMany({ where, skip, take: limit, orderBy, include: DEMAND_INCLUDE }),
      prisma.demand.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string) {
    const demand = await prisma.demand.findUnique({
      where: { id },
      include: {
        ...DEMAND_INCLUDE,
        tasks: {
          include: { assignedTo: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        serviceOrders: { orderBy: { createdAt: 'desc' } },
        attachments: true,
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!demand) throw new NotFoundError('Demanda');
    return demand;
  }

  async create(data: {
    type: DemandType;
    title: string;
    description: string;
    unitId: string;
    categoryId?: string;
    priority: Priority;
    createdById: string;
    assignedToId?: string;
  }) {
    const number = await generateDemandNumber();
    const slaConfig = await slaService.findConfig(data.type, data.priority);
    const slaDueDate = slaConfig
      ? new Date(Date.now() + slaConfig.resolutionTime * 60 * 1000)
      : null;

    const demand = await prisma.demand.create({
      data: { ...data, number, slaDueDate },
      include: DEMAND_INCLUDE,
    });

    await prisma.demandStatusHistory.create({
      data: {
        demandId: demand.id,
        toStatus: 'OPEN',
        changedById: data.createdById,
      },
    });

    return demand;
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    unitId: string;
    categoryId: string;
    priority: Priority;
    assignedToId: string;
  }>) {
    await this.findById(id);
    return prisma.demand.update({ where: { id }, data, include: DEMAND_INCLUDE });
  }

  async updateStatus(id: string, status: DemandStatus, changedById: string, reason?: string) {
    const demand = await this.findById(id);

    const updated = await prisma.demand.update({
      where: { id },
      data: {
        status,
        closedAt: ['CLOSED', 'CANCELLED'].includes(status) ? new Date() : null,
      },
      include: DEMAND_INCLUDE,
    });

    await prisma.demandStatusHistory.create({
      data: {
        demandId: id,
        fromStatus: demand.status,
        toStatus: status,
        changedById,
        reason,
      },
    });

    return updated;
  }

  async addComment(demandId: string, content: string, authorId: string) {
    await this.findById(demandId);
    return prisma.comment.create({
      data: { demandId, content, authorId },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async checkSlaBreaches() {
    const now = new Date();
    await prisma.demand.updateMany({
      where: {
        slaDueDate: { lt: now },
        slaBreached: false,
        status: { notIn: ['CLOSED', 'CANCELLED'] },
      },
      data: { slaBreached: true },
    });
  }
}

export const demandsService = new DemandsService();
