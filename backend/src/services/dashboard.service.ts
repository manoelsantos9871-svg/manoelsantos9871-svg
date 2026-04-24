import { prisma } from '../lib/prisma';

export class DashboardService {
  async getOverview() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalDemands,
      openDemands,
      closedThisMonth,
      slaBreached,
      pendingTasks,
      openServiceOrders,
    ] = await prisma.$transaction([
      prisma.demand.count(),
      prisma.demand.count({ where: { status: { notIn: ['CLOSED', 'CANCELLED'] } } }),
      prisma.demand.count({ where: { status: 'CLOSED', closedAt: { gte: thirtyDaysAgo } } }),
      prisma.demand.count({ where: { slaBreached: true, status: { notIn: ['CLOSED', 'CANCELLED'] } } }),
      prisma.task.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
      prisma.serviceOrder.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    ]);

    return { totalDemands, openDemands, closedThisMonth, slaBreached, pendingTasks, openServiceOrders };
  }

  async getDemandsByStatus() {
    return prisma.demand.groupBy({
      by: ['status'],
      _count: { status: true },
      orderBy: { _count: { status: 'desc' } },
    });
  }

  async getDemandsByType() {
    return prisma.demand.groupBy({
      by: ['type'],
      _count: { type: true },
    });
  }

  async getDemandsByPriority() {
    return prisma.demand.groupBy({
      by: ['priority'],
      _count: { priority: true },
    });
  }

  async getVolumeByPeriod(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const demands = await prisma.demand.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, { date: string; total: number; closed: number }> = {};
    demands.forEach((d) => {
      const day = d.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { date: day, total: 0, closed: 0 };
      byDay[day].total++;
      if (d.status === 'CLOSED') byDay[day].closed++;
    });

    return Object.values(byDay);
  }

  async getTopTechnicians(limit = 10) {
    const result = await prisma.demand.groupBy({
      by: ['assignedToId'],
      where: { assignedToId: { not: null }, status: 'CLOSED' },
      _count: { assignedToId: true },
      orderBy: { _count: { assignedToId: 'desc' } },
      take: limit,
    });

    const withNames = await Promise.all(
      result
        .filter((r) => r.assignedToId)
        .map(async (r) => {
          const user = await prisma.user.findUnique({
            where: { id: r.assignedToId! },
            select: { id: true, name: true },
          });
          return { ...user, resolved: r._count.assignedToId };
        }),
    );

    return withNames;
  }

  async getAvgResolutionTime() {
    const closed = await prisma.demand.findMany({
      where: { status: 'CLOSED', closedAt: { not: null } },
      select: { createdAt: true, closedAt: true, type: true },
    });

    if (!closed.length) return { overall: 0, byType: [] };

    const totalMinutes = closed.reduce((sum, d) => {
      const diff = (d.closedAt!.getTime() - d.createdAt.getTime()) / 60000;
      return sum + diff;
    }, 0);

    const byType: Record<string, { count: number; total: number }> = {};
    closed.forEach((d) => {
      if (!byType[d.type]) byType[d.type] = { count: 0, total: 0 };
      byType[d.type].count++;
      byType[d.type].total += (d.closedAt!.getTime() - d.createdAt.getTime()) / 60000;
    });

    return {
      overall: Math.round(totalMinutes / closed.length),
      byType: Object.entries(byType).map(([type, v]) => ({
        type,
        avgMinutes: Math.round(v.total / v.count),
      })),
    };
  }
}

export const dashboardService = new DashboardService();
