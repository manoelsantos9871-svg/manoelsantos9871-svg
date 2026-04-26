import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Clock, CheckSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Pagination from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingPage } from '@/components/ui/Loading';
import { tasksService } from '@/services/tasks.service';
import { usersService } from '@/services/users.service';
import { demandsService } from '@/services/demands.service';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/utils/constants';
import { formatDate, formatMinutes } from '@/utils/formatters';
import { Task } from '@/types';
import { useAuthStore } from '@/store/auth.store';

const STATUSES = Object.entries(TASK_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));

interface CreateForm { demandId: string; title: string; description: string; assignedToId: string; dueDate: string }

export default function TasksPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newStatus, setNewStatus] = useState('');

  const params = { page, limit: 20, search, ...(statusFilter && { status: statusFilter }) };
  const { data, isLoading } = useQuery({ queryKey: ['tasks', params], queryFn: () => tasksService.findAll(params) });
  const { data: techUsers } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersService.findAll({ status: 'ACTIVE', limit: '100' }),
  });
  const { data: demands } = useQuery({
    queryKey: ['demands-list'],
    queryFn: () => demandsService.findAll({ limit: 100, status: 'IN_PROGRESS' }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>();

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => tasksService.create({
      ...d,
      assignedToId: d.assignedToId || undefined,
      dueDate: d.dueDate || undefined,
    }),
    onSuccess: () => {
      toast.success('Tarefa criada!');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreate(false);
      reset();
    },
    onError: () => toast.error('Erro ao criar tarefa'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => tasksService.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status atualizado');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTask(null);
      setNewStatus('');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const userOptions = techUsers?.data?.map((u) => ({ value: u.id, label: u.name })) || [];
  const demandOptions = demands?.data?.map((d) => ({ value: d.id, label: `${d.number} — ${d.title}` })) || [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tarefas"
        subtitle={data ? `${data.pagination.total} registros` : ''}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Nova Tarefa</Button>
        }
      />

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-9"
          />
        </div>
        <select
          className="input-base sm:w-48"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Todos os status</option>
          {STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Task Cards */}
      {isLoading ? <LoadingPage /> : !data?.data?.length ? (
        <div className="card">
          <EmptyState
            title="Nenhuma tarefa encontrada"
            icon={<CheckSquare className="h-8 w-8 text-gray-400" />}
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Nova Tarefa</Button>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Tarefa</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden md:table-cell">Demanda</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden lg:table-cell">Responsável</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden lg:table-cell">Prazo</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden xl:table-cell">Tempo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.data.map((task: Task) => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                      {task.description && <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{task.description}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-mono text-gray-400">{task.demand.number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${TASK_STATUS_COLORS[task.status]}`}>{TASK_STATUS_LABELS[task.status]}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{task.assignedTo?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {task.dueDate ? (
                        <span className={`text-xs flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? 'text-red-500' : 'text-gray-500'}`}>
                          <Clock className="h-3 w-3" />
                          {formatDate(task.dueDate)}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-gray-500">{task.timeSpent > 0 ? formatMinutes(task.timeSpent) : '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {!['COMPLETED', 'CANCELLED'].includes(task.status) && user && ['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(user.role) && (
                        <button
                          onClick={() => { setSelectedTask(task); setNewStatus(''); }}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Atualizar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pagination && (
            <Pagination {...data.pagination} onPageChange={setPage} />
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset(); }}
        title="Nova Tarefa"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); reset(); }}>Cancelar</Button>
            <Button loading={createMutation.isPending} onClick={handleSubmit((d) => createMutation.mutate(d))}>Criar Tarefa</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Select label="Demanda" required options={demandOptions} placeholder="Selecione" error={errors.demandId?.message} {...register('demandId', { required: 'Obrigatório' })} />
          <Input label="Título" required error={errors.title?.message} {...register('title', { required: 'Obrigatório' })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <textarea rows={3} className="input-base resize-none" {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Responsável" options={userOptions} placeholder="Sem atribuição" {...register('assignedToId')} />
            <Input label="Prazo" type="date" {...register('dueDate')} />
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Atualizar Status da Tarefa"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedTask(null)}>Cancelar</Button>
            <Button
              loading={statusMutation.isPending}
              disabled={!newStatus}
              onClick={() => selectedTask && statusMutation.mutate({ id: selectedTask.id, status: newStatus })}
            >
              Atualizar
            </Button>
          </>
        }
      >
        {selectedTask && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTask.title}</p>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input-base">
              <option value="">Selecione o novo status</option>
              {STATUSES.filter(o => o.value !== selectedTask.status).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
      </Modal>
    </div>
  );
}
