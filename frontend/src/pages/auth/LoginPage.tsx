import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Heart, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';

interface LoginForm { email: string; password: string }

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onLogin = async (form: LoginForm) => {
    setLoading(true);
    try {
      const result = await authService.login(form.email, form.password);
      setUser(result.user);
      navigate('/');
      toast.success(`Bem-vindo, ${result.user.name}!`);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      let msg = 'Credenciais inválidas';
      if (firebaseError?.code === 'auth/user-not-found' || firebaseError?.code === 'auth/wrong-password' || firebaseError?.code === 'auth/invalid-credential') {
        msg = 'E-mail ou senha incorretos';
      } else if (firebaseError?.code === 'auth/too-many-requests') {
        msg = 'Muitas tentativas. Tente novamente mais tarde.';
      } else if (firebaseError?.message) {
        msg = firebaseError.message;
      }
      toast.error(msg);
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
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Secretaria Municipal de Saúde — DETS © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
