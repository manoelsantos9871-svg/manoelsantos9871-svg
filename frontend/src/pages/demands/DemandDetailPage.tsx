import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, User, Tag, AlertTriangle, MessageSquare, CheckSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { LoadingPage } from '@/components/ui/Loading';
import { demandsService } from '@/services/demands.service';
import {
  DEMAND_TYPE_LABELS, PRIORITY_LABELS, DEMAND_STATUS_LABELS,
  PRIORITY_COLORS, DEMAND_STATUS_COLORS, TASK_STATUS_LABELS, TASK_STATUS_COLORS,
} from '@/utils/constants';
import { formatDateTime, formatRelative, formatDate } from '@/utils/formatters';
import { useAuthStore } from '@/store/auth.store';
import { DemandStatus } from '@/types';

const STATUS_OPTIONS = Object.entries(DEMAND_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));

export default function DemandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const { data: demand, isLoading } = useQuery({
    queryKey: ['demand', id],
    queryFn: () => demandsService.findById(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => demandsService.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status atualizado');
      qc.invalidateQueries({ queryKey: ['demand', id] });
      qc.invalidateQueries({ queryKey: ['demands'] });
      setNewStatus('');
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => demandsService.addComment(id!, content),
    onSuccess: () => {
      toast.success('Comentário adicionado');
      qc.invalidateQueries({ queryKey: ['demand', id] });
      setComment('');
    },
    onError: () => toast.error('Erro ao adicionar comentário'),
  });

  if (isLoading) return <LoadingPage />;
  if (!demand) return <div className="text-center py-16 text-gray-400">Demanda não encontrada</div>;

  const canChangeStatus = user && ['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(user.role);
  const isSlaWarning = demand.slaDueDate && !demand.slaBreached && new Date(demand.slaDueDate).getTime() - Date.now() < 2 * 60 * 60 * 1000;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/demands')} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-gray-400">{demand.number}</span>
            <span className={`badge ${DEMAND_TYPE_LABELS[demand.type] ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' : ''}`}>
              {DEMAND_TYPE_LABELS[demand.type]}
            </span>
            <span className={`badge ${PRIORITY_COLORS[demand.priority]}`}>{PRIORITY_LABELS[demand.priority]}</span>
            <span className={`badge ${DEMAND_STATUS_COLORS[demand.status]}`}>{DEMAND_STATUS_LABELS[demand.status]}</span>
            {demand.slaBreached && (
              <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> SLA Violado
              </span>
            )}
            {isSlaWarning && !demand.slaBreached && (
              <span className="badge bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 flex items-center gap-1">
                <Clock className="h-3 w-3" /> SLA Próximo
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{demand.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Descrição</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{demand.description}</p>
          </div>

          {/* Tasks */}
          {demand.tasks && demand.tasks.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <CheckSquare className="h-4 w-4" /> Tarefas ({demand.tasks.length})
              </h3>
              <div className="space-y-2">
                {demand.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                      {task.assignedTo && <p className="text-xs text-gray-400">{task.assignedTo.name}</p>}
                    </div>
                    <span className={`badge flex-shrink-0 ml-2 ${TASK_STATUS_COLORS[task.status]}`}>
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Comentários ({demand.comments?.length || 0})
            </h3>
            <div className="space-y-3 mb-4">
              {demand.comments?.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {c.author.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{c.author.name}</span>
                      <span className="text-xs text-gray-400">{formatRelative(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
              {!demand.comments?.length && <p className="text-sm text-gray-400">Nenhum comentário ainda.</p>}
            </div>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Adicionar comentário..."
                className="input-base resize-none flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey && comment.trim()) {
                    commentMutation.mutate(comment.trim());
                  }
                }}
              />
              <Button
                icon={<Send className="h-4 w-4" />}
                loading={commentMutation.isPending}
                disabled={!comment.trim()}
                onClick={() => commentMutation.mutate(comment.trim())}
              />
            </div>
          </div>

          {/* Status History */}
          {demand.statusHistory && demand.statusHistory.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Histórico de Status</h3>
              <div className="space-y-2">
                {demand.statusHistory.map((h, i) => (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-400" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {h.fromStatus ? `${DEMAND_STATUS_LABELS[h.fromStatus]} → ` : ''}
                        <span className="font-medium text-gray-900 dark:text-white">{DEMAND_STATUS_LABELS[h.toStatus]}</span>
                      </p>
                      {h.reason && <p className="text-xs text-gray-400 italic">{h.reason}</p>}
                      <p className="text-xs text-gray-400">{formatDateTime(h.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Change Status */}
          {canChangeStatus && !['CLOSED', 'CANCELLED'].includes(demand.status) && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Atualizar Status</h3>
              <div className="space-y-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="input-base"
                >
                  <option value="">Selecione o novo status</option>
                  {STATUS_OPTIONS.filter(o => o.value !== demand.status).map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Button
                  className="w-full justify-center"
                  loading={statusMutation.isPending}
                  disabled={!newStatus}
                  onClick={() => statusMutation.mutate(newStatus as DemandStatus)}
                >
                  Atualizar Status
                </Button>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Informações</h3>
            <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Unidade" value={demand.unit.name} />
            <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Criado por" value={demand.createdBy.name} />
            <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Responsável" value={demand.assignedTo?.name || '—'} />
            {demand.slaDueDate && (
              <InfoRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Prazo SLA"
                value={formatDate(demand.slaDueDate, "dd/MM 'às' HH:mm")}
                valueClass={demand.slaBreached ? 'text-red-500' : ''}
              />
            )}
            <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Criado" value={formatDateTime(demand.createdAt)} />
            <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Atualizado" value={formatRelative(demand.updatedAt)} />
            {demand._count && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex gap-4 text-xs text-gray-500">
                <span>{demand._count.tasks} tarefas</span>
                <span>{demand._count.comments} comentários</span>
                <span>{demand._count.attachments} anexos</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, valueClass = '' }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-xs font-medium text-gray-700 dark:text-gray-300 truncate ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}
