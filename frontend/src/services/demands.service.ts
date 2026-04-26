import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  CollectionReference,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Demand, DemandStatus, PaginatedResponse } from '@/types';

function tsToIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function docToDemand(id: string, data: DocumentData): Demand {
  return {
    id,
    number: data.number ?? '',
    type: data.type ?? 'REQUEST',
    title: data.title ?? '',
    description: data.description ?? '',
    unitId: data.unitId ?? '',
    unit: data.unit ?? { id: data.unitId ?? '', name: data.unitName ?? '', code: data.unitCode ?? '' },
    categoryId: data.categoryId,
    category: data.category ?? (data.categoryId ? { id: data.categoryId, name: data.categoryName ?? '', color: data.categoryColor ?? '#6366f1' } : undefined),
    priority: data.priority ?? 'MEDIUM',
    status: data.status ?? 'OPEN',
    createdById: data.createdById ?? '',
    createdBy: data.createdBy ?? { id: data.createdById ?? '', name: data.createdByName ?? '', email: data.createdByEmail ?? '' },
    assignedToId: data.assignedToId,
    assignedTo: data.assignedTo ?? (data.assignedToId ? { id: data.assignedToId, name: data.assignedToName ?? '', email: data.assignedToEmail ?? '' } : undefined),
    slaDueDate: data.slaDueDate ? tsToIso(data.slaDueDate) : undefined,
    slaBreached: data.slaBreached ?? false,
    closedAt: data.closedAt ? tsToIso(data.closedAt) : undefined,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
    _count: data._count ?? { tasks: 0, comments: 0, attachments: 0 },
  };
}

async function getNextDemandNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const q = query(
    collection(db, 'demands') as CollectionReference<DocumentData>,
    orderBy('number', 'desc'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    return `DEM-${year}-00001`;
  }
  const lastNumber: string = snap.docs[0].data().number ?? `DEM-${year}-00000`;
  const parts = lastNumber.split('-');
  const lastSeq = parseInt(parts[2] ?? '0', 10);
  const nextSeq = String(lastSeq + 1).padStart(5, '0');
  return `DEM-${year}-${nextSeq}`;
}

async function calculateSlaDueDate(demandType: string, priority: string, createdAt: Date): Promise<Date | null> {
  const q = query(
    collection(db, 'slaConfigs') as CollectionReference<DocumentData>,
    where('demandType', '==', demandType),
    where('priority', '==', priority),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const sla = snap.docs[0].data();
  const resolutionHours: number = sla.resolutionTime ?? 24;
  return new Date(createdAt.getTime() + resolutionHours * 60 * 60 * 1000);
}

export const demandsService = {
  async findAll(params?: Record<string, string | number | boolean>): Promise<PaginatedResponse<Demand>> {
    let q = query(
      collection(db, 'demands') as CollectionReference<DocumentData>,
      orderBy('createdAt', 'desc'),
    );

    const constraints = [];
    if (params?.status) constraints.push(where('status', '==', params.status));
    if (params?.type) constraints.push(where('type', '==', params.type));
    if (params?.priority) constraints.push(where('priority', '==', params.priority));
    if (params?.assignedToId) constraints.push(where('assignedToId', '==', params.assignedToId));

    if (constraints.length > 0) {
      q = query(
        collection(db, 'demands') as CollectionReference<DocumentData>,
        ...constraints,
        orderBy('createdAt', 'desc'),
      );
    }

    const snap = await getDocs(q);
    let demands = snap.docs.map((d) => docToDemand(d.id, d.data()));

    // Client-side search filter
    if (params?.search && typeof params.search === 'string') {
      const search = params.search.toLowerCase();
      demands = demands.filter(
        (d) =>
          d.title.toLowerCase().includes(search) ||
          d.number.toLowerCase().includes(search) ||
          d.description.toLowerCase().includes(search),
      );
    }

    const page = Number(params?.page ?? 1);
    const pageLimit = Number(params?.limit ?? 20);
    const total = demands.length;
    const start = (page - 1) * pageLimit;
    const paginated = demands.slice(start, start + pageLimit);

    return {
      success: true,
      data: paginated,
      pagination: {
        page,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit),
      },
    };
  },

  async findById(id: string): Promise<Demand> {
    const [snap, commentsSnap, historySnap] = await Promise.all([
      getDoc(doc(db, 'demands', id)),
      getDocs(query(collection(db, 'demands', id, 'comments'), orderBy('createdAt', 'asc'))),
      getDocs(query(collection(db, 'demands', id, 'history'), orderBy('createdAt', 'asc'))),
    ]);
    if (!snap.exists()) throw new Error('Demand not found');
    const demand = docToDemand(snap.id, snap.data());
    demand.comments = commentsSnap.docs.map((c) => ({
      id: c.id,
      content: c.data().content ?? '',
      author: c.data().author ?? { id: '', name: '' },
      createdAt: tsToIso(c.data().createdAt),
    }));
    demand.statusHistory = historySnap.docs.map((h) => ({
      id: h.id,
      fromStatus: h.data().fromStatus,
      toStatus: h.data().toStatus,
      changedById: h.data().changedById,
      reason: h.data().reason,
      createdAt: tsToIso(h.data().createdAt),
    }));
    return demand;
  },

  async create(payload: Record<string, unknown>): Promise<Demand> {
    const now = new Date();
    const [number, slaDue] = await Promise.all([
      getNextDemandNumber(),
      calculateSlaDueDate(payload.type as string, payload.priority as string, now),
    ]);

    const docData = {
      ...payload,
      number,
      status: 'OPEN',
      slaBreached: false,
      slaDueDate: slaDue ? Timestamp.fromDate(slaDue) : null,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      _count: { tasks: 0, comments: 0, attachments: 0 },
    };

    const ref = await addDoc(collection(db, 'demands'), docData);
    return this.findById(ref.id);
  },

  async update(id: string, payload: Record<string, unknown>): Promise<Demand> {
    await updateDoc(doc(db, 'demands', id), {
      ...payload,
      updatedAt: Timestamp.fromDate(new Date()),
    });
    return this.findById(id);
  },

  async updateStatus(
    id: string,
    status: DemandStatus,
    reason?: string,
    userId?: string,
  ): Promise<Demand> {
    const snap = await getDoc(doc(db, 'demands', id));
    const fromStatus = snap.exists() ? snap.data().status : undefined;
    const now = Timestamp.fromDate(new Date());

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: now,
    };
    if (status === 'CLOSED' || status === 'CANCELLED') {
      updateData.closedAt = now;
    }

    await updateDoc(doc(db, 'demands', id), updateData);

    await addDoc(collection(db, 'demands', id, 'history'), {
      fromStatus,
      toStatus: status,
      changedById: userId ?? null,
      reason: reason ?? null,
      createdAt: now,
    });

    return this.findById(id);
  },

  async addComment(
    demandId: string,
    content: string,
    authorId: string,
    authorName: string,
  ): Promise<void> {
    const now = Timestamp.fromDate(new Date());
    await addDoc(collection(db, 'demands', demandId, 'comments'), {
      content,
      author: { id: authorId, name: authorName },
      createdAt: now,
    });
    // increment comment count
    const snap = await getDoc(doc(db, 'demands', demandId));
    if (snap.exists()) {
      const count = snap.data()._count ?? { tasks: 0, comments: 0, attachments: 0 };
      await updateDoc(doc(db, 'demands', demandId), {
        _count: { ...count, comments: (count.comments ?? 0) + 1 },
        updatedAt: now,
      });
    }
  },

  async deleteDemand(id: string): Promise<void> {
    await deleteDoc(doc(db, 'demands', id));
  },
};
