import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { authService } from '@/services/auth.service';

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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setUser, isAuthenticated, accessToken } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      authService.getMe().then(setUser).catch(() => useAuthStore.getState().logout());
    }
  }, [isAuthenticated, accessToken, setUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
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
