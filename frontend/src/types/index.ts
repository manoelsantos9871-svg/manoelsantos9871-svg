export type UserRole = 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'REQUESTER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type DemandType = 'INCIDENT' | 'REQUEST' | 'IMPROVEMENT' | 'PROJECT';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DemandStatus = 'OPEN' | 'IN_TRIAGE' | 'IN_PROGRESS' | 'WAITING_THIRD_PARTY' | 'IN_VALIDATION' | 'CLOSED' | 'CANCELLED';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'WAITING_THIRD_PARTY' | 'COMPLETED' | 'CANCELLED';
export type SOStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  matricula: string;
  role: UserRole;
  sector: string;
  email: string;
  status: UserStatus;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  name: string;
  code: string;
  type?: string;
  address?: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  active: boolean;
}

export interface Demand {
  id: string;
  number: string;
  type: DemandType;
  title: string;
  description: string;
  unitId: string;
  unit: { id: string; name: string; code: string };
  categoryId?: string;
  category?: { id: string; name: string; color: string };
  priority: Priority;
  status: DemandStatus;
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  assignedToId?: string;
  assignedTo?: { id: string; name: string; email: string };
  slaDueDate?: string;
  slaBreached: boolean;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number; comments: number; attachments: number };
  tasks?: Task[];
  comments?: Comment[];
  statusHistory?: DemandStatusHistory[];
}

export interface Task {
  id: string;
  demandId: string;
  demand: { id: string; number: string; title: string };
  title: string;
  description?: string;
  assignedToId?: string;
  assignedTo?: { id: string; name: string; email: string };
  dueDate?: string;
  status: TaskStatus;
  timeSpent: number;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number; attachments: number };
  comments?: Comment[];
  timeEntries?: TimeEntry[];
}

export interface ServiceOrder {
  id: string;
  number: string;
  demandId: string;
  demand: { id: string; number: string; title: string };
  title: string;
  description: string;
  executorId?: string;
  executor?: { id: string; name: string; email: string };
  status: SOStatus;
  startDate?: string;
  endDate?: string;
  signature?: string;
  notes?: string;
  checklists: SOChecklist[];
  createdAt: string;
  updatedAt: string;
}

export interface SOChecklist {
  id: string;
  serviceOrderId: string;
  item: string;
  completed: boolean;
  completedAt?: string;
  sortOrder: number;
}

export interface SLAConfig {
  id: string;
  demandType: DemandType;
  priority: Priority;
  responseTime: number;
  resolutionTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  minutes: number;
  description?: string;
  startedAt: string;
  user: { id: string; name: string };
  createdAt: string;
}

export interface DemandStatusHistory {
  id: string;
  fromStatus?: DemandStatus;
  toStatus: DemandStatus;
  changedById?: string;
  reason?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: { id: string; name: string; email: string };
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface DashboardOverview {
  totalDemands: number;
  openDemands: number;
  closedThisMonth: number;
  slaBreached: number;
  pendingTasks: number;
  openServiceOrders: number;
}
