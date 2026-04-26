import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, limit, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { runSeed } from '@/lib/seed';

interface SetupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  matricula: string;
  sector: string;
}

export default function SetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SetupForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    matricula: 'ADM-001',
    sector: 'TI',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'seeding' | 'done'>('form');
  const [error, setError] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<{ units: number; categories: number; slaConfigs: number } | null>(null);

  // Redirect if users already exist
  const [checked, setChecked] = useState(false);
  if (!checked) {
    getDocs(query(collection(db, 'users'), limit(1))).then((snap) => {
      if (!snap.empty) navigate('/login', { replace: true });
    }).catch(() => {});
    setChecked(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setStep('form');

    try {
      // 1. Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = credential.user.uid;
      const now = Timestamp.fromDate(new Date());

      // 2. Create user doc + seed in parallel
      setStep('seeding');
      const [, result] = await Promise.all([
        setDoc(doc(db, 'users', uid), {
          name: form.name,
          email: form.email,
          matricula: form.matricula,
          role: 'ADMIN',
          sector: form.sector,
          status: 'ACTIVE',
          mfaEnabled: false,
          lastLoginAt: null,
          createdAt: now,
          updatedAt: now,
        }),
        runSeed(db),
      ]);
      setSeedResult(result);
      setStep('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      setStep('form');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Configuração concluída!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Sistema configurado com sucesso.
          </p>
          {seedResult && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left text-sm space-y-1">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Unidades criadas:</span> {seedResult.units}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Categorias criadas:</span> {seedResult.categories}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Configs. SLA criadas:</span> {seedResult.slaConfigs}
              </p>
            </div>
          )}
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Acessar o sistema
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HealthTech DETS</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Configuração inicial do sistema</p>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6 text-sm text-blue-700 dark:text-blue-300">
          Nenhum usuário encontrado. Crie a conta de administrador para começar.
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome completo
            </label>
            <input
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Administrador do Sistema"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              E-mail
            </label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@healthtech.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Matrícula
              </label>
              <input
                name="matricula"
                type="text"
                required
                value={form.matricula}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Setor
              </label>
              <input
                name="sector"
                type="text"
                required
                value={form.sector}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Senha
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar senha
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repita a senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {step === 'seeding' ? 'Populando dados...' : 'Criando conta...'}
              </>
            ) : (
              'Configurar sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
