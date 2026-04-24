import { DemandType, Priority, DemandStatus, TaskStatus, SOStatus, UserRole } from '@/types';

export const DEMAND_TYPE_LABELS: Record<DemandType, string> = {
  INCIDENT: 'Incidente',
  REQUEST: 'Requisição',
  IMPROVEMENT: 'Melhoria',
  PROJECT: 'Projeto',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = {
  OPEN: 'Aberto',
  IN_TRIAGE: 'Em Triagem',
  IN_PROGRESS: 'Em Andamento',
  WAITING_THIRD_PARTY: 'Aguardando Terceiros',
  IN_VALIDATION: 'Em Validação',
  CLOSED: 'Fechado',
  CANCELLED: 'Cancelado',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  WAITING_THIRD_PARTY: 'Aguardando Terceiros',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export const SO_STATUS_LABELS: Record<SOStatus, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em Execução',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  TECHNICIAN: 'Técnico',
  REQUESTER: 'Solicitante',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export const DEMAND_STATUS_COLORS: Record<DemandStatus, string> = {
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  IN_TRIAGE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  WAITING_THIRD_PARTY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  IN_VALIDATION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  CLOSED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  WAITING_THIRD_PARTY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};
