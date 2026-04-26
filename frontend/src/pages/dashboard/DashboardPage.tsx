import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Ticket, CheckSquare, ClipboardList, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import StatsCard from '@/components/ui/StatsCard';
import { LoadingPage } from '@/components/ui/Loading';
import { dashboardService } from '@/services/dashboard.service';
import { DEMAND_TYPE_LABELS, DEMAND_STATUS_LABELS } from '@/utils/constants';
import { formatMinutes } from '@/utils/formatters';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardService.getFullDashboard(30),
    staleTime: 2 * 60_000,
  });

  if (isLoading || !data) return <LoadingPage />;

  const { overview, byStatus, byType, volume, technicians, avgTime } = data;

  const pieData = byStatus.map((d) => ({
    name: DEMAND_STATUS_LABELS[d.status as keyof typeof DEMAND_STATUS_LABELS] || d.status,
    value: d._count.status,
  }));

  const typeData = byType.map((d) => ({
    name: DEMAND_TYPE_LABELS[d.type as keyof typeof DEMAND_TYPE_LABELS] || d.type,
    value: d._count.type,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dashboard" subtitle="Visão geral do Departamento de Tecnologia em Saúde" />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard title="Total Demandas" value={overview.totalDemands} icon={<Ticket />} color="blue" />
        <StatsCard title="Abertas" value={overview.openDemands} icon={<Ticket />} color="purple" />
        <StatsCard title="Fechadas/Mês" value={overview.closedThisMonth} icon={<TrendingUp />} color="green" />
        <StatsCard title="SLA Violado" value={overview.slaBreached} icon={<AlertTriangle />} color="red" />
        <StatsCard title="Tarefas Ativas" value={overview.pendingTasks} icon={<CheckSquare />} color="orange" />
        <StatsCard title="OS Abertas" value={overview.openServiceOrders} icon={<ClipboardList />} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Volume de Demandas — Últimos 30 dias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={volume}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} labelFormatter={(v) => `Data: ${v}`} />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#totalGrad)" name="Total" strokeWidth={2} />
              <Area type="monotone" dataKey="closed" stroke="#22c55e" fill="transparent" name="Fechadas" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Por Status</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">Sem dados</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Demandas por Tipo</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" name="Qtd." radius={[0, 4, 4, 0]}>
                {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            <Users className="inline h-4 w-4 mr-1.5 text-gray-400" />
            Top Técnicos — Resoluções
          </h3>
          {technicians.length > 0 ? (
            <div className="space-y-3">
              {technicians.slice(0, 5).map((t, i) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-semibold text-primary-700 dark:text-primary-400">
                    {t.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.name}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${(t.resolved / (technicians[0]?.resolved || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.resolved}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">Sem dados</div>
          )}
        </div>
      </div>

      {avgTime.overall > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tempo Médio de Resolução</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">{formatMinutes(avgTime.overall)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Geral</p>
            </div>
            {avgTime.byType.map((t) => (
              <div key={t.type} className="text-center">
                <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{formatMinutes(t.avgMinutes)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{DEMAND_TYPE_LABELS[t.type as keyof typeof DEMAND_TYPE_LABELS]}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
