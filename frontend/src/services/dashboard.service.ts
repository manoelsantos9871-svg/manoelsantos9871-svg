import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DashboardOverview } from '@/types';

function tsToIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function getDateKey(value: unknown): string {
  const iso = tsToIso(value);
  return iso.slice(0, 10); // YYYY-MM-DD
}

export const dashboardService = {
  async getOverview(): Promise<DashboardOverview> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all demands
    const demandsSnap = await getDocs(collection(db, 'demands'));
    const demands = demandsSnap.docs.map((d) => d.data() as DocumentData);

    const totalDemands = demands.length;
    const openStatuses = ['OPEN', 'IN_TRIAGE', 'IN_PROGRESS', 'WAITING_THIRD_PARTY', 'IN_VALIDATION'];
    const openDemands = demands.filter((d) => openStatuses.includes(d.status)).length;
    const closedThisMonth = demands.filter((d) => {
      if (d.status !== 'CLOSED') return false;
      const closedAt = d.closedAt instanceof Timestamp ? d.closedAt.toDate() : new Date(d.closedAt ?? 0);
      return closedAt >= startOfMonth;
    }).length;
    const slaBreached = demands.filter((d) => d.slaBreached === true).length;

    // Fetch pending tasks
    const tasksSnap = await getDocs(
      query(collection(db, 'tasks'), where('status', '==', 'PENDING')),
    );
    const pendingTasks = tasksSnap.size;

    // Fetch open service orders
    const soSnap = await getDocs(
      query(collection(db, 'serviceOrders'), where('status', '==', 'OPEN')),
    );
    const openServiceOrders = soSnap.size;

    return { totalDemands, openDemands, closedThisMonth, slaBreached, pendingTasks, openServiceOrders };
  },

  async getDemandsByStatus(): Promise<Array<{ status: string; _count: { status: number } }>> {
    const snap = await getDocs(collection(db, 'demands'));
    const counts: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const status: string = d.data().status ?? 'OPEN';
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      status,
      _count: { status: count },
    }));
  },

  async getDemandsByType(): Promise<Array<{ type: string; _count: { type: number } }>> {
    const snap = await getDocs(collection(db, 'demands'));
    const counts: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const type: string = d.data().type ?? 'REQUEST';
      counts[type] = (counts[type] ?? 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      type,
      _count: { type: count },
    }));
  },

  async getDemandsByPriority(): Promise<Array<{ priority: string; _count: { priority: number } }>> {
    const snap = await getDocs(collection(db, 'demands'));
    const counts: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const priority: string = d.data().priority ?? 'MEDIUM';
      counts[priority] = (counts[priority] ?? 0) + 1;
    });
    return Object.entries(counts).map(([priority, count]) => ({
      priority,
      _count: { priority: count },
    }));
  },

  async getVolumeByPeriod(days = 30): Promise<Array<{ date: string; total: number; closed: number }>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffTs = Timestamp.fromDate(cutoff);

    const snap = await getDocs(
      query(collection(db, 'demands'), where('createdAt', '>=', cutoffTs), orderBy('createdAt', 'asc')),
    );

    const byDate: Record<string, { total: number; closed: number }> = {};

    // Pre-fill every day in the range with zeros
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDate[d.toISOString().slice(0, 10)] = { total: 0, closed: 0 };
    }

    snap.docs.forEach((d) => {
      const data = d.data();
      const key = getDateKey(data.createdAt);
      if (!byDate[key]) byDate[key] = { total: 0, closed: 0 };
      byDate[key].total += 1;
      if (data.status === 'CLOSED') byDate[key].closed += 1;
    });

    return Object.entries(byDate).map(([date, vals]) => ({ date, ...vals }));
  },

  async getTopTechnicians(): Promise<Array<{ id: string; name: string; resolved: number }>> {
    const snap = await getDocs(
      query(collection(db, 'demands'), where('status', '==', 'CLOSED')),
    );
    const counts: Record<string, { name: string; resolved: number }> = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      const id: string = data.assignedToId;
      if (!id) return;
      const name: string = data.assignedToName ?? data.assignedTo?.name ?? 'Unknown';
      if (!counts[id]) counts[id] = { name, resolved: 0 };
      counts[id].resolved += 1;
    });
    return Object.entries(counts)
      .map(([id, val]) => ({ id, name: val.name, resolved: val.resolved }))
      .sort((a, b) => b.resolved - a.resolved)
      .slice(0, 10);
  },

  async getAvgResolutionTime(): Promise<{ overall: number; byType: Array<{ type: string; avgMinutes: number }> }> {
    const snap = await getDocs(
      query(collection(db, 'demands'), where('status', '==', 'CLOSED')),
    );

    const byType: Record<string, { totalMinutes: number; count: number }> = {};
    let totalMinutes = 0;
    let totalCount = 0;

    snap.docs.forEach((d) => {
      const data = d.data();
      const type: string = data.type ?? 'REQUEST';
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt ?? 0);
      const closedAt = data.closedAt instanceof Timestamp ? data.closedAt.toDate() : (data.closedAt ? new Date(data.closedAt) : null);
      if (!closedAt) return;
      const minutes = (closedAt.getTime() - createdAt.getTime()) / 60000;
      if (!byType[type]) byType[type] = { totalMinutes: 0, count: 0 };
      byType[type].totalMinutes += minutes;
      byType[type].count += 1;
      totalMinutes += minutes;
      totalCount += 1;
    });

    const overall = totalCount > 0 ? Math.round(totalMinutes / totalCount) : 0;
    const byTypeResult = Object.entries(byType).map(([type, val]) => ({
      type,
      avgMinutes: val.count > 0 ? Math.round(val.totalMinutes / val.count) : 0,
    }));

    return { overall, byType: byTypeResult };
  },
};
