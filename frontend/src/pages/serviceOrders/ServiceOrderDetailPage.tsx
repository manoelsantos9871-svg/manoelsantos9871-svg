import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadingPage } from '@/components/ui/Loading';
import { serviceOrdersService } from '@/services/serviceOrders.service';
import { SO_STATUS_LABELS } from '@/utils/constants';
import { formatDateTime } from '@/utils/formatters';
import { useAuthStore } from '@/store/auth.store';

const SO_STATUS_OPTIONS = Object.entries(SO_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));

export default function ServiceOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: so, isLoading } = useQuery({
    queryKey: ['service-order', id],
    queryFn: () => serviceOrdersService.findById(id!),
    enabled: !!id,
  });

  const checklistMutation = useMutation({
    mutationFn: ({ checklistId, completed }: { checklistId: string; completed: boolean }) =>
      serviceOrdersService.updateChecklist(id!, checklistId, completed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-order', id] }),
    onError: () => toast.error('Erro ao atualizar checklist'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => serviceOrdersService.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status atualizado');
      qc.invalidateQueries({ queryKey: ['service-order', id] });
      qc.invalidateQueries({ queryKey: ['service-orders'] });
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  if (isLoading) return <LoadingPage />;
  if (!so) return <div className="text-center py-16 text-gray-400">OS não encontrada</div>;

  const completedCount = so.checklists.filter((c) => c.completed).length;
  const progress = so.checklists.length > 0 ? (completedCount / so.checklists.length) * 100 : 0;
  const canEdit = user && ['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(user.role);

  const statusColor: Record<string, string> = {
    OPEN: 'badge bg-blue-100 text-blue-700',
    IN_PROGRESS: 'badge bg-orange-100 text-orange-700',
    COMPLETED: 'badge bg-green-100 text-green-700',
    CANCELLED: 'badge bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/service-orders')} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-gray-400">{so.number}</span>
            <span className={statusColor[so.status] || 'badge'}>{SO_STATUS_LABELS[so.status]}</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{so.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Descrição</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{so.description}</p>
          </div>

          {/* Checklist */}
          {so.checklists.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Checklist ({completedCount}/{so.checklists.length})
                </h3>
                <span className="text-sm font-medium text-primary-600">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <div className="h-2 rounded-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="space-y-2">
                {so.checklists.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => canEdit && !['COMPLETED', 'CANCELLED'].includes(so.status) && checklistMutation.mutate({ checklistId: item.id, completed: !item.completed })}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      item.completed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {item.completed
                      ? <CheckSquare className="h-4 w-4 text-green-500 flex-shrink-0" />
                      : <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                    <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {item.item}
                    </span>
                    {item.completedAt && (
                      <span className="ml-auto text-xs text-gray-400">{formatDateTime(item.completedAt)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {so.notes && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Observações</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{so.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Update Status */}
          {canEdit && !['COMPLETED', 'CANCELLED'].includes(so.status) && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Atualizar Status</h3>
              <div className="space-y-2">
                {SO_STATUS_OPTIONS.filter(o => o.value !== so.status && o.value !== 'OPEN').map(o => (
                  <button
                    key={o.value}
                    onClick={() => statusMutation.mutate(o.value)}
                    disabled={statusMutation.isPending}
                    className="w-full btn-secondary text-xs justify-center"
                  >
                    → {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Informações</h3>
            <InfoRow label="Demanda" value={so.demand.number} />
            <InfoRow label="Executor" value={so.executor?.name || '—'} />
            <InfoRow label="Início" value={so.startDate ? formatDateTime(so.startDate) : '—'} />
            <InfoRow label="Conclusão" value={so.endDate ? formatDateTime(so.endDate) : '—'} />
            <InfoRow label="Criado em" value={formatDateTime(so.createdAt)} />
            {so.signature && (
              <div>
                <p className="text-xs text-gray-400">Assinatura</p>
                <p className="text-xs text-green-600 font-medium mt-0.5">✓ Assinado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{value}</p>
    </div>
  );
}
