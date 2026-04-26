import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DashboardOverview } from '@/types';

export interface FullDashboard {
  overview: DashboardOverview;
  byStatus: Array<{ status: string; _count: { status: number } }>;
  byType: Array<{ type: string; _count: { type: number } }>;
  volume: Array<{ date: string; total: number; closed: number }>;
  technicians: Array<{ id: string; name: string; resolved: number }>;
  avgTime: { overall: number; byType: Array<{ type: string; avgMinutes: number }> };
}

export const dashboardService = {
  // Update the stats counter document (call after demand create/update)
  async updateStats(delta: Partial<Record<string, number>>): Promise<void> {
    const ref = doc(db, 'stats', 'overview');
    const updates: Record<string, ReturnType<typeof increment>> = {};
    for (const [k, v] of Object.entries(delta)) {
      if (v !== 0) updates[k] = increment(v as number);
    }
    if (Object.keys(updates).length) {
      await setDoc(ref, updates, { merge: true });
    }
  },

  // Single call that fetches everything in parallel and computes all stats
  async getFullDashboard(days = 30): Promise<FullDashboard> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffTs = Timestamp.fromDate(cutoff);
    const startOfMonthTs = Timestamp.fromDate(startOfMonth);

    // Fetch everything in parallel
    const [demandsSnap, tasksSnap, soSnap, volumeSnap] = await Promise.all([
      getDocs(collection(db, 'demands')),
      getDocs(query(collection(db, 'tasks'), where('status', 'in', ['PENDING', 'IN_PROGRESS']))),
      getDocs(query(collection(db, 'serviceOrders'), where('status', 'in', ['OPEN', 'IN_PROGRESS']))),
      getDocs(query(collection(db, 'demands'), where('createdAt', '>=', cutoffTs), orderBy('createdAt', 'asc'))),
    ]);

    const demands = demandsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentData));
    const openStatuses = ['OPEN', 'IN_TRIAGE', 'IN_PROGRESS', 'WAITING_THIRD_PARTY', 'IN_VALIDATION'];

    // --- Overview ---
    const totalDemands = demands.length;
    const openDemands = demands.filter((d) => openStatuses.includes(d.status)).length;
    const closedThisMonth = demands.filter((d) => {
      if (d.status !== 'CLOSED') return false;
      const t = d.closedAt instanceof Timestamp ? d.closedAt : null;
      return t && t >= startOfMonthTs;
    }).length;
    const slaBreached = demands.filter((d) => d.slaBreached === true).length;
    const pendingTasks = tasksSnap.size;
    const openServiceOrders = soSnap.size;

    // --- By Status ---
    const statusCounts: Record<string, number> = {};
    demands.forEach((d) => {
      statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;
    });
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      _count: { status: count },
    }));

    // --- By Type ---
    const typeCounts: Record<string, number> = {};
    demands.forEach((d) => {
      typeCounts[d.type ?? 'REQUEST'] = (typeCounts[d.type ?? 'REQUEST'] ?? 0) + 1;
    });
    const byType = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      _count: { type: count },
    }));

    // --- Volume by Period ---
    const byDate: Record<string, { total: number; closed: number }> = {};
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      byDate[d.toISOString().slice(0, 10)] = { total: 0, closed: 0 };
    }
    volumeSnap.docs.forEach((d) => {
      const data = d.data();
      const ts = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt ?? 0);
      const key = ts.toISOString().slice(0, 10);
      if (!byDate[key]) byDate[key] = { total: 0, closed: 0 };
      byDate[key].total += 1;
      if (data.status === 'CLOSED') byDate[key].closed += 1;
    });
    const volume = Object.entries(byDate).map(([date, vals]) => ({ date, ...vals }));

    // --- Top Technicians (from already-fetched demands) ---
    const techCounts: Record<string, { name: string; resolved: number }> = {};
    demands.filter((d) => d.status === 'CLOSED' && d.assignedToId).forEach((d) => {
      const id: string = d.assignedToId;
      const name: string = d.assignedToName ?? d.assignedTo?.name ?? 'Unknown';
      if (!techCounts[id]) techCounts[id] = { name, resolved: 0 };
      techCounts[id].resolved += 1;
    });
    const technicians = Object.entries(techCounts)
      .map(([id, val]) => ({ id, name: val.name, resolved: val.resolved }))
      .sort((a, b) => b.resolved - a.resolved)
      .slice(0, 10);

    // --- Avg Resolution Time (from already-fetched demands) ---
    const byTypeTime: Record<string, { totalMinutes: number; count: number }> = {};
    let totalMinutes = 0;
    let totalCount = 0;
    demands.filter((d) => d.status === 'CLOSED').forEach((d) => {
      const type: string = d.type ?? 'REQUEST';
      const createdAt = d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(d.createdAt ?? 0);
      const closedAt = d.closedAt instanceof Timestamp ? d.closedAt.toDate() : (d.closedAt ? new Date(d.closedAt) : null);
      if (!closedAt) return;
      const mins = (closedAt.getTime() - createdAt.getTime()) / 60000;
      if (!byTypeTime[type]) byTypeTime[type] = { totalMinutes: 0, count: 0 };
      byTypeTime[type].totalMinutes += mins;
      byTypeTime[type].count += 1;
      totalMinutes += mins;
      totalCount += 1;
    });
    const avgTime = {
      overall: totalCount > 0 ? Math.round(totalMinutes / totalCount) : 0,
      byType: Object.entries(byTypeTime).map(([type, val]) => ({
        type,
        avgMinutes: val.count > 0 ? Math.round(val.totalMinutes / val.count) : 0,
      })),
    };

    return {
      overview: { totalDemands, openDemands, closedThisMonth, slaBreached, pendingTasks, openServiceOrders },
      byStatus,
      byType,
      volume,
      technicians,
      avgTime,
    };
  },

  // Legacy methods kept for backward compatibility
  async getOverview(): Promise<DashboardOverview> {
    return (await this.getFullDashboard()).overview;
  },
  async getDemandsByStatus() { return (await this.getFullDashboard()).byStatus; },
  async getDemandsByType() { return (await this.getFullDashboard()).byType; },
  async getDemandsByPriority(): Promise<Array<{ priority: string; _count: { priority: number } }>> {
    const snap = await getDocs(collection(db, 'demands'));
    const counts: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const p: string = d.data().priority ?? 'MEDIUM';
      counts[p] = (counts[p] ?? 0) + 1;
    });
    return Object.entries(counts).map(([priority, count]) => ({ priority, _count: { priority: count } }));
  },
  async getVolumeByPeriod(days = 30) { return (await this.getFullDashboard(days)).volume; },
  async getTopTechnicians() { return (await this.getFullDashboard()).technicians; },
  async getAvgResolutionTime() { return (await this.getFullDashboard()).avgTime; },
};
