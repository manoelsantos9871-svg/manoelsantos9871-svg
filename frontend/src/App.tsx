import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';

import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import DemandsPage from '@/pages/demands/DemandsPage';
import DemandDetailPage from '@/pages/demands/DemandDetailPage';
import TasksPage from '@/pages/tasks/TasksPage';
import ServiceOrdersPage from '@/pages/serviceOrders/ServiceOrdersPage';
import ServiceOrderDetailPage from '@/pages/serviceOrders/ServiceOrderDetailPage';
import UsersPage from '@/pages/users/UsersPage';
import SLAPage from '@/pages/sla/SLAPage';
import AuditPage from '@/pages/audit/AuditPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import SetupPage from '@/pages/setup/SetupPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { initialize, isAuthenticated, loading } = useAuthStore();
  const { theme } = useThemeStore();
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = snap.exists() ? snap.data() : null;
          const user = userData
            ? {
                id: firebaseUser.uid,
                name: userData.name ?? '',
                matricula: userData.matricula ?? '',
                role: userData.role ?? 'REQUESTER',
                sector: userData.sector ?? '',
                email: userData.email ?? firebaseUser.email ?? '',
                status: userData.status ?? 'ACTIVE',
                mfaEnabled: userData.mfaEnabled ?? false,
                lastLoginAt: userData.lastLoginAt ?? null,
                createdAt: userData.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
                updatedAt: userData.updatedAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
              }
            : null;
          initialize(firebaseUser, user);
        } catch {
          initialize(firebaseUser, null);
        }
      } else {
        // No user signed in — check if setup is needed
        try {
          const { getDocs, collection, limit, query } = await import('firebase/firestore');
          const snap = await getDocs(query(collection(db, 'users'), limit(1)));
          setSetupRequired(snap.empty);
        } catch {
          setSetupRequired(false);
        }
        initialize(null, null);
      }
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando HealthTech DETS...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* One-time setup route */}
        <Route path="/setup" element={<SetupPage />} />

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : setupRequired ? (
              <Navigate to="/setup" replace />
            ) : (
              <LoginPage />
            )
          }
        />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="demands" element={<DemandsPage />} />
          <Route path="demands/:id" element={<DemandDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="service-orders" element={<ServiceOrdersPage />} />
          <Route path="service-orders/:id" element={<ServiceOrderDetailPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="sla" element={<SLAPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
