import { TaskStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../utils/errors';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { TaskFilters, PaginationQuery } from '../types';

type TaskQuery = TaskFilters & PaginationQuery;

const TASK_INCLUDE = {
  demand: { select: { id: true, number: true, title: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  _count: { select: { comments: true, attachments: true } },
};

export class TasksService {
  async findAll(filters: TaskQuery) {
    const { page, limit, skip, orderBy } = getPaginationParams(filters);
    const where: Record<string, unknown> = {};

    if (filters.status) where.status = filters.status;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.demandId) where.demandId = filters.demandId;
    if (filters.search) {
      where.OR = [{ title: { contains: filters.search, mode: 'insensitive' } }];
    }

    const [data, total] = await prisma.$transaction([
      prisma.task.findMany({ where, skip, take: limit, orderBy, include: TASK_INCLUDE }),
      prisma.task.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        ...TASK_INCLUDE,
        comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        attachments: true,
        timeEntries: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!task) throw new NotFoundError('Tarefa');
    return task;
  }

  async create(data: {
    demandId: string;
    title: string;
    description?: string;
    assignedToId?: string;
    dueDate?: Date;
  }) {
    return prisma.task.create({ data, include: TASK_INCLUDE });
  }

  async update(id: string, data: Partial<{
    title: string;
    description: string;
    assignedToId: string;
    dueDate: Date;
  }>) {
    await this.findById(id);
    return prisma.task.update({ where: { id }, data, include: TASK_INCLUDE });
  }

  async updateStatus(id: string, status: TaskStatus, changedById: string, reason?: string) {
    const task = await this.findById(id);

    const updated = await prisma.task.update({ where: { id }, data: { status }, include: TASK_INCLUDE });

    await prisma.taskStatusHistory.create({
      data: { taskId: id, fromStatus: task.status, toStatus: status, changedById, reason },
    });

    return updated;
  }

  async logTime(taskId: string, userId: string, minutes: number, description: string, startedAt: Date) {
    await this.findById(taskId);
    await prisma.$transaction([
      prisma.timeEntry.create({ data: { taskId, userId, minutes, description, startedAt } }),
      prisma.task.update({ where: { id: taskId }, data: { timeSpent: { increment: minutes } } }),
    ]);
  }

  async addComment(taskId: string, content: string, authorId: string) {
    await this.findById(taskId);
    return prisma.comment.create({
      data: { taskId, content, authorId },
      include: { author: { select: { id: true, name: true } } },
    });
  }
}

export const tasksService = new TasksService();
