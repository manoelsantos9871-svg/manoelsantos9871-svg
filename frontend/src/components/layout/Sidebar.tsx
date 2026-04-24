import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Ticket, CheckSquare, ClipboardList, Users,
  Clock, Shield, BarChart2, Settings, X, Heart, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { ROLE_LABELS } from '@/utils/constants';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/demands', icon: Ticket, label: 'Demandas' },
  { to: '/tasks', icon: CheckSquare, label: 'Tarefas' },
  { to: '/service-orders', icon: ClipboardList, label: 'Ordens de Serviço' },
  { to: '/reports', icon: BarChart2, label: 'Relatórios' },
];

const adminItems = [
  { to: '/users', icon: Users, label: 'Usuários', roles: ['ADMIN', 'MANAGER'] },
  { to: '/sla', icon: Clock, label: 'Gestão de SLA', roles: ['ADMIN', 'MANAGER'] },
  { to: '/audit', icon: Shield, label: 'Auditoria', roles: ['ADMIN', 'MANAGER'] },
  { to: '/settings', icon: Settings, label: 'Configurações', roles: ['ADMIN'] },
];

interface Props { onClose: () => void }

export default function Sidebar({ onClose }: Props) {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">HealthTech</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">DETS — Gestão de TI</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Principal</p>
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{label}</span>
            <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
          </NavLink>
        ))}

        {user && ['ADMIN', 'MANAGER'].includes(user.role) && (
          <>
            <p className="mt-4 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Administração</p>
            {adminItems
              .filter((item) => item.roles.includes(user.role))
              .map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
          </>
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
