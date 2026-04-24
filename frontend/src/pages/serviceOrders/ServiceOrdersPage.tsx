import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { serviceOrdersService } from '@/services/serviceOrders.service';
import { usersService } from '@/services/users.service';
import { demandsService } from '@/services/demands.service';
import { SO_STATUS_LABELS } from '@/utils/constants';
import { formatRelative } from '@/utils/formatters';
import { ServiceOrder } from '@/types';

const SO_STATUSES = Object.entries(SO_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));

const DEFAULT_CHECKLISTS = [
  'Verificar disponibilidade de equipamentos',
  'Confirmar acesso ao local',
  'Executar procedimento técnico',
  'Testar funcionamento após intervenção',
  'Coletar assinatura do responsável',
];

interface CreateForm { demandId: string; title: string; description: string; executorId: string }

export default function ServiceOrdersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const params = { page, limit: 15, search, ...(statusFilter && { status: statusFilter }) };
  const { data, isLoading } = useQuery({ queryKey: ['service-orders', params], queryFn: () => serviceOrdersService.findAll(params) });
  const { data: techUsers } = useQuery({ queryKey: ['users-all'], queryFn: () => usersService.findAll({ status: 'ACTIVE', limit: '100' }) });
  const { data: demands } = useQuery({ queryKey: ['demands-list'], queryFn: () => demandsService.findAll({ limit: 100 }) });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>();

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) =>
      serviceOrdersService.create({ ...d, executorId: d.executorId || undefined, checklists: DEFAULT_CHECKLISTS }),
    onSuccess: () => {
      toast.success('Ordem de Serviço criada!');
      qc.invalidateQueries({ queryKey: ['service-orders'] });
      setShowCreate(false);
      reset();
    },
    onError: () => toast.error('Erro ao criar OS'),
  });

  const userOptions = techUsers?.data?.map((u) => ({ value: u.id, label: u.name })) || [];
  const demandOptions = demands?.data?.map((d) => ({ value: d.id, label: `${d.number} — ${d.title}` })) || [];

  const statusColor: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    IN_PROGRESS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ordens de Serviço"
        subtitle={data ? `${data.pagination.total} registros` : ''}
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Nova OS</Button>}
      />

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar OS..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-9"
          />
        </div>
        <select className="input-base sm:w-48" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">Todos os status</option>
          {SO_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? <LoadingPage /> : !data?.data?.length ? (
        <div className="card">
          <EmptyState
            icon={<ClipboardList className="h-8 w-8 text-gray-400" />}
            title="Nenhuma OS encontrada"
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Nova OS</Button>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Número</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Título</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden md:table-cell">Demanda</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden lg:table-cell">Executor</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden xl:table-cell">Criado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.data.map((so: ServiceOrder) => (
                  <tr
                    key={so.id}
                    onClick={() => navigate(`/service-orders/${so.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3"><span className="font-mono text-xs text-gray-500">{so.number}</span></td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{so.title}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-mono text-gray-400">{so.demand.number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${statusColor[so.status] || ''}`}>{SO_STATUS_LABELS[so.status]}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{so.executor?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-gray-400">{formatRelative(so.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pagination && <Pagination {...data.pagination} onPageChange={setPage} />}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset(); }}
        title="Nova Ordem de Serviço"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); reset(); }}>Cancelar</Button>
            <Button loading={createMutation.isPending} onClick={handleSubmit((d) => createMutation.mutate(d))}>Criar OS</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Select label="Demanda" required options={demandOptions} placeholder="Selecione" error={errors.demandId?.message} {...register('demandId', { required: 'Obrigatório' })} />
          <Input label="Título" required error={errors.title?.message} {...register('title', { required: 'Obrigatório' })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição <span className="text-red-500">*</span></label>
            <textarea rows={3} className={`input-base resize-none ${errors.description ? 'border-red-400' : ''}`} {...register('description', { required: 'Obrigatório' })} />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>
          <Select label="Executor" options={userOptions} placeholder="Sem atribuição" {...register('executorId')} />
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-xs text-blue-700 dark:text-blue-300">
            Checklist padrão será incluído automaticamente com {DEFAULT_CHECKLISTS.length} itens.
          </div>
        </form>
      </Modal>
    </div>
  );
}
