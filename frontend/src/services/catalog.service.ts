import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Unit, Category, SLAConfig, ApiResponse } from '@/types';

function tsToIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function docToUnit(id: string, data: DocumentData): Unit {
  return {
    id,
    name: data.name ?? '',
    code: data.code ?? '',
    type: data.type ?? undefined,
    address: data.address ?? undefined,
    active: data.active ?? true,
  };
}

function docToCategory(id: string, data: DocumentData): Category {
  return {
    id,
    name: data.name ?? '',
    type: data.type ?? '',
    color: data.color ?? '#6366f1',
    active: data.active ?? true,
  };
}

function docToSlaConfig(id: string, data: DocumentData): SLAConfig {
  return {
    id,
    demandType: data.demandType ?? 'REQUEST',
    priority: data.priority ?? 'MEDIUM',
    responseTime: data.responseTime ?? 4,
    resolutionTime: data.resolutionTime ?? 24,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export const catalogService = {
  // ── Units ──────────────────────────────────────────────────────────────────
  async getUnits(): Promise<Unit[]> {
    const snap = await getDocs(query(collection(db, 'units'), orderBy('name', 'asc')));
    return snap.docs.map((d) => docToUnit(d.id, d.data()));
  },

  async getUnit(id: string): Promise<Unit> {
    const snap = await getDoc(doc(db, 'units', id));
    if (!snap.exists()) throw new Error('Unit not found');
    return docToUnit(snap.id, snap.data());
  },

  async createUnit(payload: Record<string, unknown>): Promise<Unit> {
    const now = Timestamp.fromDate(new Date());
    const ref = await addDoc(collection(db, 'units'), {
      ...payload,
      active: payload.active ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return docToUnit(ref.id, { ...payload, active: payload.active ?? true });
  },

  async updateUnit(id: string, payload: Record<string, unknown>): Promise<Unit> {
    const now = Timestamp.fromDate(new Date());
    await updateDoc(doc(db, 'units', id), { ...payload, updatedAt: now });
    return this.getUnit(id);
  },

  // ── Categories ─────────────────────────────────────────────────────────────
  async getCategories(): Promise<Category[]> {
    const snap = await getDocs(query(collection(db, 'categories'), orderBy('name', 'asc')));
    return snap.docs.map((d) => docToCategory(d.id, d.data()));
  },

  async getCategory(id: string): Promise<Category> {
    const snap = await getDoc(doc(db, 'categories', id));
    if (!snap.exists()) throw new Error('Category not found');
    return docToCategory(snap.id, snap.data());
  },

  async createCategory(payload: Record<string, unknown>): Promise<Category> {
    const now = Timestamp.fromDate(new Date());
    const ref = await addDoc(collection(db, 'categories'), {
      ...payload,
      active: payload.active ?? true,
      createdAt: now,
      updatedAt: now,
    });
    return docToCategory(ref.id, { ...payload, active: payload.active ?? true });
  },

  async updateCategory(id: string, payload: Record<string, unknown>): Promise<Category> {
    const now = Timestamp.fromDate(new Date());
    await updateDoc(doc(db, 'categories', id), { ...payload, updatedAt: now });
    return this.getCategory(id);
  },

  // ── SLA Configs ────────────────────────────────────────────────────────────
  async getSlaConfigs(): Promise<SLAConfig[]> {
    const snap = await getDocs(collection(db, 'slaConfigs'));
    return snap.docs.map((d) => docToSlaConfig(d.id, d.data()));
  },

  async getSlaConfig(id: string): Promise<SLAConfig> {
    const snap = await getDoc(doc(db, 'slaConfigs', id));
    if (!snap.exists()) throw new Error('SLA config not found');
    return docToSlaConfig(snap.id, snap.data());
  },

  async createSlaConfig(payload: Record<string, unknown>): Promise<SLAConfig> {
    const now = Timestamp.fromDate(new Date());
    const ref = await addDoc(collection(db, 'slaConfigs'), {
      ...payload,
      createdAt: now,
      updatedAt: now,
    });
    return docToSlaConfig(ref.id, { ...payload, createdAt: now, updatedAt: now });
  },

  async updateSlaConfig(id: string, payload: Record<string, unknown>): Promise<SLAConfig> {
    const now = Timestamp.fromDate(new Date());
    await updateDoc(doc(db, 'slaConfigs', id), { ...payload, updatedAt: now });
    return this.getSlaConfig(id);
  },

  async upsertSla(payload: Record<string, unknown>): Promise<SLAConfig> {
    if (payload.id) {
      return this.updateSlaConfig(payload.id as string, payload);
    }
    return this.createSlaConfig(payload);
  },

  async deleteSla(id: string): Promise<void> {
    await deleteDoc(doc(db, 'slaConfigs', id));
  },

  async getSlaStats(): Promise<ApiResponse<unknown>> {
    const configs = await this.getSlaConfigs();
    return { success: true, data: { total: configs.length, configs } };
  },

  async getAuditLogs(params?: Record<string, string>): Promise<unknown> {
    const constraints = [];
    if (params?.entityType) {
      const { where } = await import('firebase/firestore');
      constraints.push(where('entityType', '==', params.entityType));
    }
    const q =
      constraints.length > 0
        ? query(collection(db, 'auditLogs'), ...constraints, orderBy('createdAt', 'desc'))
        : query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'));

    const snap = await getDocs(q);
    const logs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: tsToIso(d.data().createdAt),
    }));

    const page = Number(params?.page ?? 1);
    const pageLimit = Number(params?.limit ?? 20);
    const total = logs.length;
    const start = (page - 1) * pageLimit;
    const paginated = logs.slice(start, start + pageLimit);

    return {
      success: true,
      data: paginated,
      pagination: { page, limit: pageLimit, total, totalPages: Math.ceil(total / pageLimit) },
    };
  },
};
