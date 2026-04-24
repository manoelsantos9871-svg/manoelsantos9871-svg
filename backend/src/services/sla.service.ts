import { DemandType, Priority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../utils/errors';

export class SLAService {
  async findAll() {
    return prisma.sLAConfig.findMany({ orderBy: [{ demandType: 'asc' }, { priority: 'asc' }] });
  }

  async findConfig(demandType: DemandType, priority: Priority) {
    return prisma.sLAConfig.findUnique({ where: { demandType_priority: { demandType, priority } } });
  }

  async upsert(demandType: DemandType, priority: Priority, responseTime: number, resolutionTime: number) {
    return prisma.sLAConfig.upsert({
      where: { demandType_priority: { demandType, priority } },
      create: { demandType, priority, responseTime, resolutionTime },
      update: { responseTime, resolutionTime },
    });
  }

  async delete(id: string) {
    const config = await prisma.sLAConfig.findUnique({ where: { id } });
    if (!config) throw new NotFoundError('Configuração SLA');
    return prisma.sLAConfig.delete({ where: { id } });
  }

  async getSlaStats() {
    const now = new Date();
    const [total, breached, nearBreach] = await prisma.$transaction([
      prisma.demand.count({ where: { status: { notIn: ['CLOSED', 'CANCELLED'] }, slaDueDate: { not: null } } }),
      prisma.demand.count({ where: { slaBreached: true, status: { notIn: ['CLOSED', 'CANCELLED'] } } }),
      prisma.demand.count({
        where: {
          slaBreached: false,
          status: { notIn: ['CLOSED', 'CANCELLED'] },
          slaDueDate: { lte: new Date(now.getTime() + 2 * 60 * 60 * 1000), gte: now },
        },
      }),
    ]);

    const complianceRate = total > 0 ? Math.round(((total - breached) / total) * 100) : 100;
    return { total, breached, nearBreach, complianceRate };
  }
}

export const slaService = new SLAService();
