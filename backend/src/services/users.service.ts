import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { NotFoundError, ConflictError } from '../utils/errors';
import { getPaginationParams, buildPaginatedResult } from '../utils/pagination';
import { PaginationQuery } from '../types';

interface UserFilters extends PaginationQuery {
  role?: UserRole;
  status?: UserStatus;
  sector?: string;
}

interface CreateUserData {
  name: string;
  matricula: string;
  role: UserRole;
  sector: string;
  email: string;
  password: string;
}

const USER_SELECT = {
  id: true, name: true, matricula: true, role: true, sector: true,
  email: true, status: true, mfaEnabled: true, lastLoginAt: true,
  createdAt: true, updatedAt: true,
};

export class UsersService {
  async findAll(filters: UserFilters) {
    const { page, limit, skip, orderBy } = getPaginationParams(filters);
    const where: Record<string, unknown> = {};

    if (filters.role) where.role = filters.role;
    if (filters.status) where.status = filters.status;
    if (filters.sector) where.sector = { contains: filters.sector, mode: 'insensitive' };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { matricula: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.user.findMany({ where, skip, take: limit, orderBy, select: USER_SELECT }),
      prisma.user.count({ where }),
    ]);

    return buildPaginatedResult(data, total, page, limit);
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundError('Usuário');
    return user;
  }

  async create(data: CreateUserData) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { matricula: data.matricula }] },
    });
    if (existing) throw new ConflictError('E-mail ou matrícula já cadastrado');

    const passwordHash = await bcrypt.hash(data.password, config.bcrypt.rounds);
    return prisma.user.create({
      data: { ...data, passwordHash, password: undefined } as Parameters<typeof prisma.user.create>[0]['data'],
      select: USER_SELECT,
    });
  }

  async update(id: string, data: Partial<Omit<CreateUserData, 'password'>>) {
    await this.findById(id);
    return prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }

  async updateStatus(id: string, status: UserStatus) {
    await this.findById(id);
    return prisma.user.update({ where: { id }, data: { status }, select: USER_SELECT });
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findById(id);
    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
  }

  async getStats() {
    const [total, active, byRole] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
    ]);
    return { total, active, inactive: total - active, byRole };
  }
}

export const usersService = new UsersService();
