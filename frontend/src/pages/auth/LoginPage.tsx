import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Heart, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

interface LoginForm { email: string; password: string }
interface MfaForm { token: string }

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setTokens } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaState, setMfaState] = useState<{ required: boolean; userId: string } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const { register: regMfa, handleSubmit: handleMfaSubmit, formState: { errors: mfaErrors } } = useForm<MfaForm>();

  const onLogin = async (form: LoginForm) => {
    setLoading(true);
    try {
      const result = await authService.login(form.email, form.password);
      if (result.requiresMfa && result.userId) {
        setMfaState({ required: true, userId: result.userId });
        return;
      }
      setTokens(result.accessToken!, result.refreshToken!);
      const me = await authService.getMe();
      setUser(me);
      navigate('/');
      toast.success(`Bem-vindo, ${me.name}!`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  const onMfa = async (form: MfaForm) => {
    if (!mfaState) return;
    setLoading(true);
    try {
      const result = await authService.verifyMfa(mfaState.userId, form.token);
      setTokens(result.accessToken, result.refreshToken);
      const me = await authService.getMe();
      setUser(me);
      navigate('/');
      toast.success(`Bem-vindo, ${me.name}!`);
    } catch {
      toast.error('Código MFA inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-600 shadow-lg shadow-primary-500/30 mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HealthTech DETS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sistema de Gestão de Tecnologia em Saúde
          </p>
        </div>

        <div className="card p-8">
          {!mfaState ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Entrar no sistema</h2>
              <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail institucional</label>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="seu@saude.gov.br"
                    className={`input-base ${errors.email ? 'border-red-400' : ''}`}
                    {...register('email', { required: 'E-mail obrigatório', pattern: { value: /\S+@\S+\.\S+/, message: 'E-mail inválido' } })}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={`input-base pr-10 ${errors.password ? 'border-red-400' : ''}`}
                      {...register('password', { required: 'Senha obrigatória', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5 mt-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
                  <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Autenticação MFA</h2>
                <p className="text-sm text-gray-500 mt-1">Digite o código do seu aplicativo autenticador</p>
              </div>
              <form onSubmit={handleMfaSubmit(onMfa)} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código de 6 dígitos</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className={`input-base text-center text-xl tracking-widest font-mono ${mfaErrors.token ? 'border-red-400' : ''}`}
                    {...regMfa('token', { required: true, pattern: /^\d{6}$/, minLength: 6, maxLength: 6 })}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Verificar
                </button>
                <button type="button" onClick={() => setMfaState(null)} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-2">
                  Voltar ao login
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Secretaria Municipal de Saúde — DETS © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
