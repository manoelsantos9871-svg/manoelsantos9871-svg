import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCheck, UserX } from 'lucide-react';
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
import { usersService } from '@/services/users.service';
import { ROLE_LABELS } from '@/utils/constants';
import { formatRelative } from '@/utils/formatters';
import { User, UserRole } from '@/types';

const ROLES = Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }));

interface CreateForm { name: string; matricula: string; email: string; role: string; sector: string; password: string }

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search }],
    queryFn: () => usersService.findAll({ page: String(page), limit: '20', search }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>();

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => usersService.create(d as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Usuário criado com sucesso!');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowCreate(false);
      reset();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erro ao criar usuário');
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => usersService.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Status atualizado');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  const roleColor: Record<UserRole, string> = {
    ADMIN: 'badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    MANAGER: 'badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    TECHNICIAN: 'badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    REQUESTER: 'badge bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Usuários"
        subtitle={data ? `${data.pagination.total} usuários` : ''}
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Novo Usuário</Button>}
      />

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou matrícula..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-9"
          />
        </div>
      </div>

      {isLoading ? <LoadingPage /> : !data?.data?.length ? (
        <div className="card">
          <EmptyState title="Nenhum usuário encontrado" action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Novo Usuário</Button>} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Usuário</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden md:table-cell">Matrícula</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Perfil</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden lg:table-cell">Setor</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-gray-500 hidden xl:table-cell">Último acesso</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.data.map((user: User) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-semibold text-primary-700 dark:text-primary-400">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs text-gray-500">{user.matricula}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={roleColor[user.role]}>{ROLE_LABELS[user.role]}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-500 truncate max-w-[150px] block">{user.sector}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500'}`}>
                        {user.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <span className="text-xs text-gray-400">{user.lastLoginAt ? formatRelative(user.lastLoginAt) : 'Nunca'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus.mutate({ id: user.id, status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                        className={`rounded-lg p-1.5 transition-colors ${user.status === 'ACTIVE' ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-green-400 hover:bg-green-50 hover:text-green-600'}`}
                        title={user.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                      >
                        {user.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
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
        title="Novo Usuário"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); reset(); }}>Cancelar</Button>
            <Button loading={createMutation.isPending} onClick={handleSubmit((d) => createMutation.mutate(d))}>Criar Usuário</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input label="Nome completo" required error={errors.name?.message} {...register('name', { required: 'Obrigatório' })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Matrícula" required error={errors.matricula?.message} {...register('matricula', { required: 'Obrigatório' })} />
            <Select label="Perfil" required options={ROLES} placeholder="Selecione" error={errors.role?.message} {...register('role', { required: 'Obrigatório' })} />
          </div>
          <Input label="E-mail institucional" type="email" required error={errors.email?.message} {...register('email', { required: 'Obrigatório' })} />
          <Input label="Setor" required error={errors.sector?.message} {...register('sector', { required: 'Obrigatório' })} />
          <Input label="Senha inicial" type="password" required hint="Mínimo 8 caracteres" error={errors.password?.message} {...register('password', { required: 'Obrigatório', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} />
        </form>
      </Modal>
    </div>
  );
}
