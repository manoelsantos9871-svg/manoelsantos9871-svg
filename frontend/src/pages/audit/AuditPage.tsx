import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingPage } from '@/components/ui/Loading';
import { catalogService } from '@/services/catalog.service';
import { formatDateTime } from '@/utils/formatters';
import { AuditLog } from '@/types';

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  LOGIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');

  const params = { page: String(page), limit: '25', ...(search && { action: search }), ...(entityType && { entityType }) };
  const { data, isLoading } = useQuery({
    queryKey: ['audit', params],
    queryFn: () => catalogService.getAuditLogs(params),
  });

  const result = data as { data: AuditLog[]; pagination: { page: number; totalPages: number; total: number; limit: number } } | undefined;

  const entityTypes = ['Demand', 'Task', 'ServiceOrder', 'User', 'SLAConfig'];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auditoria"
        subtitle="Registro imutável de todas as ações do sistema"
      />

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por ação..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-9"
          />
        </div>
        <select
          className="input-base sm:w-48"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
        >
          <option value="">Todos os tipos</option>
          {entityTypes.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {isLoading ? <LoadingPage /> : !result?.data?.length ? (
        <div className="card">
          <EmptyState icon={<Shield className="h-8 w-8 text-gray-400" />} title="Nenhum registro de auditoria" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Data/Hora</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Usuário</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Ação</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Entidade</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden lg:table-cell">ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden xl:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {result.data.map((log: AuditLog) => {
                  const actionKey = log.action.split('_')[0].toUpperCase();
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">{formatDateTime(log.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{log.user?.name || 'Sistema'}</p>
                        <p className="text-xs text-gray-400">{log.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${ACTION_COLOR[actionKey] || 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400">{log.entityType}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="font-mono text-xs text-gray-400 truncate max-w-[120px] block">{log.entityId || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="font-mono text-xs text-gray-400">{log.ipAddress || '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result.pagination && <Pagination {...result.pagination} onPageChange={setPage} />}
        </div>
      )}
    </div>
  );
}
