import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, BarChart2 } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import { LoadingPage } from '@/components/ui/Loading';
import { dashboardService } from '@/services/dashboard.service';
import { DEMAND_TYPE_LABELS, PRIORITY_LABELS } from '@/utils/constants';
import { formatMinutes } from '@/utils/formatters';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
  const { data: byType, isLoading } = useQuery({ queryKey: ['report-by-type'], queryFn: dashboardService.getDemandsByType });
  const { data: byPriority } = useQuery({ queryKey: ['report-by-priority'], queryFn: dashboardService.getDemandsByPriority });
  const { data: avgTime } = useQuery({ queryKey: ['report-avg-time'], queryFn: dashboardService.getAvgResolutionTime });
  const { data: technicians } = useQuery({ queryKey: ['report-technicians'], queryFn: dashboardService.getTopTechnicians });

  if (isLoading) return <LoadingPage />;

  const typeChartData = byType?.map((d) => ({
    name: DEMAND_TYPE_LABELS[d.type as keyof typeof DEMAND_TYPE_LABELS],
    value: d._count.type,
  })) || [];

  const priorityChartData = byPriority?.map((d: { priority: string; _count: { priority: number } }) => ({
    name: PRIORITY_LABELS[d.priority as keyof typeof PRIORITY_LABELS],
    value: d._count.priority,
  })) || [];

  const avgTimeData = avgTime?.byType?.map((d) => ({
    name: DEMAND_TYPE_LABELS[d.type as keyof typeof DEMAND_TYPE_LABELS],
    horas: Math.round(d.avgMinutes / 60),
    minutos: d.avgMinutes,
  })) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Análise de desempenho e produtividade"
        actions={
          <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
            Exportar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-gray-400" />
            Demandas por Tipo
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" name="Demandas" radius={[4, 4, 0, 0]}>
                {typeChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Priority */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-gray-400" />
            Demandas por Prioridade
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" name="Demandas" radius={[4, 4, 0, 0]}>
                {priorityChartData.map((_d: unknown, i: number) => <Cell key={i} fill={['#ef4444','#f59e0b','#3b82f6','#22c55e'][i] || COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Resolution Time */}
        {avgTimeData.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tempo Médio de Resolução (horas)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={avgTimeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(_v: number, _n, props) => [formatMinutes(props.payload.minutos), 'Tempo médio']}
                />
                <Bar dataKey="horas" name="Horas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Technicians */}
        {technicians && technicians.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Ranking de Produtividade</h3>
            <div className="space-y-3">
              {technicians.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {i + 1}º
                  </span>
                  <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700">
                    {t.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.name}</p>
                    <div className="mt-0.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-1.5 rounded-full bg-primary-500"
                        style={{ width: `${Math.round((t.resolved / (technicians[0]?.resolved || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.resolved}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
