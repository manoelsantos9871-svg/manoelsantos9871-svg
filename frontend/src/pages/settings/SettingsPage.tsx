import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Sun, Moon, Lock, Shield, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';

interface PasswordForm { currentPassword: string; newPassword: string; confirmPassword: string }

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance'>('profile');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PasswordForm>();

  const passwordMutation = useMutation({
    mutationFn: (d: PasswordForm) => authService.changePassword(d.currentPassword, d.newPassword),
    onSuccess: () => { toast.success('Senha alterada com sucesso!'); reset(); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erro ao alterar senha');
    },
  });

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: Building2 },
    { id: 'security', label: 'Segurança', icon: Lock },
    { id: 'appearance', label: 'Aparência', icon: Sun },
  ] as const;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Configurações" subtitle="Gerencie suas preferências e segurança" />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && user && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xl font-bold text-primary-700 dark:text-primary-400">
              {user.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">Matrícula: {user.matricula}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-xs text-gray-400">Perfil de acesso</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.role}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Setor</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.sector}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Status</p>
              <p className="text-sm font-medium text-green-600">{user.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">MFA</p>
              <p className={`text-sm font-medium ${user.mfaEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {user.mfaEnabled ? '✓ Habilitado' : 'Desabilitado'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4" /> Alterar Senha
            </h3>
            <form className="space-y-4" onSubmit={handleSubmit((d) => passwordMutation.mutate(d))}>
              <Input
                label="Senha atual" type="password" required
                error={errors.currentPassword?.message}
                {...register('currentPassword', { required: 'Obrigatório' })}
              />
              <Input
                label="Nova senha" type="password" required
                hint="Mínimo 8 caracteres"
                error={errors.newPassword?.message}
                {...register('newPassword', { required: 'Obrigatório', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })}
              />
              <Input
                label="Confirmar nova senha" type="password" required
                error={errors.confirmPassword?.message}
                {...register('confirmPassword', {
                  required: 'Obrigatório',
                  validate: (v) => v === watch('newPassword') || 'Senhas não conferem',
                })}
              />
              <Button type="submit" loading={passwordMutation.isPending}>Alterar Senha</Button>
            </form>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Autenticação de Dois Fatores (MFA)
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {user?.mfaEnabled
                ? 'O MFA está habilitado. Seu acesso está protegido com dupla autenticação.'
                : 'Adicione uma camada extra de segurança configurando o MFA.'}
            </p>
            <Button variant={user?.mfaEnabled ? 'danger' : 'primary'}>
              {user?.mfaEnabled ? 'Desabilitar MFA' : 'Configurar MFA'}
            </Button>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tema da Interface</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                theme === 'light' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <Sun className={`h-8 w-8 ${theme === 'light' ? 'text-primary-600' : 'text-gray-400'}`} />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Claro</p>
                <p className="text-xs text-gray-400">Interface clara</p>
              </div>
              {theme === 'light' && <span className="badge bg-primary-100 text-primary-700 text-xs">Ativo</span>}
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                theme === 'dark' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <Moon className={`h-8 w-8 ${theme === 'dark' ? 'text-primary-400' : 'text-gray-400'}`} />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Escuro</p>
                <p className="text-xs text-gray-400">Interface escura</p>
              </div>
              {theme === 'dark' && <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 text-xs">Ativo</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
