import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, AlertTriangle } from 'lucide-react';
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
import { demandsService } from '@/services/demands.service';
import { catalogService } from '@/services/catalog.service';
import { usersService } from '@/services/users.service';
import {
  DEMAND_TYPE_LABELS, PRIORITY_LABELS, DEMAND_STATUS_LABELS,
  PRIORITY_COLORS, DEMAND_STATUS_COLORS,
} from '@/utils/constants';
import { formatDate, formatRelative } from '@/utils/formatters';
import { Demand } from '@/types';
import { useAuthStore } from '@/store/auth.store';

const TYPES = Object.entries(DEMAND_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const PRIORITIES = Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }));
const STATUSES = Object.entries(DEMAND_STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }));

interface CreateForm {
  type: string; title: string; description: string;
  unitId: string; categoryId: string; priority: string; assignedToId: string;
}

export default function DemandsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const params = { page, limit: 15, search, ...filters };
  const { data, isLoading } = useQuery({
    queryKey: ['demands', params],
    queryFn: () => demandsService.findAll(params),
  });
  const { data: units } = useQuery({ queryKey: ['units'], queryFn: catalogService.getUnits });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: catalogService.getCategories });
  const { data: techUsers } = useQuery({
    queryKey: ['users-technicians'],
    queryFn: () => usersService.findAll({ role: 'TECHNICIAN', status: 'ACTIVE', limit: '100' }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>();

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => demandsService.create({
      ...d, categoryId: d.categoryId || undefined, assignedToId: d.assignedToId || undefined,
    }),
    onSuccess: () => {
      toast.success('Demanda criada com sucesso!');
      qc.invalidateQueries({ queryKey: ['demands'] });
      setShowCreate(false);
      reset();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erro ao criar demanda');
    },
  });

  const unitOptions = units?.map((u) => ({ value: u.id, label: u.name })) || [];
  const categoryOptions = categories?.map((c) => ({ value: c.id, label: c.name })) || [];
  const techOptions = techUsers?.data?.map((u) => ({ value: u.id, label: u.name })) || [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Demandas"
        subtitle={data ? `${data.pagination.total} registros` : ''}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={() => setShowFilters(!showFilters)}>
              Filtros
            </Button>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Nova Demanda
            </Button>
          </div>
        }
      />

      {/* Search & Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título, número ou descrição..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-9"
          />
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <select className="input-base" value={filters.type || ''} onChange={(e) => { setFilters(f => ({ ...f, type: e.target.value })); setPage(1); }}>
              <option value="">Todos os tipos</option>
              {TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="input-base" value={filters.priority || ''} onChange={(e) => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}>
              <option value="">Todas as prioridades</option>
              {PRIORITIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="input-base" value={filters.status || ''} onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
              <option value="">Todos os status</option>
              {STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => { setFilters({}); setSearch(''); setPage(1); }} className="btn-secondary text-xs">
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingPage />
      ) : !data?.data?.length ? (
        <div className="card">
          <EmptyState
            title="Nenhuma demanda encontrada"
            description="Crie uma nova demanda ou ajuste os filtros."
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Nova Demanda</Button>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">Número</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">Título</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider hidden md:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">Prioridade</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider hidden lg:table-cell">Responsável</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider hidden xl:table-cell">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.data.map((demand: Demand) => (
                  <tr
                    key={demand.id}
                    onClick={() => navigate(`/demands/${demand.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {demand.slaBreached && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                        <span className="font-mono text-xs text-gray-500">{demand.number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{demand.title}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[200px]">{demand.unit.name}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500">{DEMAND_TYPE_LABELS[demand.type]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${PRIORITY_COLORS[demand.priority]}`}>{PRIORITY_LABELS[demand.priority]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${DEMAND_STATUS_COLORS[demand.status]}`}>{DEMAND_STATUS_LABELS[demand.status]}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{demand.assignedTo?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-gray-400" title={formatDate(demand.createdAt)}>{formatRelative(demand.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pagination && (
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              limit={data.pagination.limit}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset(); }}
        title="Nova Demanda"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); reset(); }}>Cancelar</Button>
            <Button loading={createMutation.isPending} onClick={handleSubmit((d) => createMutation.mutate(d))}>
              Criar Demanda
            </Button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo" required
              options={TYPES} placeholder="Selecione"
              error={errors.type?.message}
              {...register('type', { required: 'Obrigatório' })}
            />
            <Select
              label="Prioridade" required
              options={PRIORITIES} placeholder="Selecione"
              error={errors.priority?.message}
              {...register('priority', { required: 'Obrigatório' })}
            />
          </div>
          <Input
            label="Título" required placeholder="Descreva brevemente o problema ou solicitação"
            error={errors.title?.message}
            {...register('title', { required: 'Obrigatório', minLength: { value: 5, message: 'Mínimo 5 caracteres' } })}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className={`input-base resize-none ${errors.description ? 'border-red-400' : ''}`}
              placeholder="Descreva detalhadamente a demanda..."
              {...register('description', { required: 'Obrigatório', minLength: { value: 10, message: 'Mínimo 10 caracteres' } })}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Unidade Solicitante" required
              options={unitOptions} placeholder="Selecione"
              error={errors.unitId?.message}
              {...register('unitId', { required: 'Obrigatório' })}
            />
            <Select
              label="Categoria"
              options={categoryOptions} placeholder="Selecione"
              {...register('categoryId')}
            />
          </div>
          {user?.role !== 'REQUESTER' && (
            <Select
              label="Atribuir para"
              options={techOptions} placeholder="Sem atribuição"
              {...register('assignedToId')}
            />
          )}
        </form>
      </Modal>
    </div>
  );
}
