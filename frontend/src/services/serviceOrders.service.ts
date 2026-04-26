import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  CollectionReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ServiceOrder, SOChecklist, PaginatedResponse } from '@/types';

function tsToIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function docToSO(id: string, data: DocumentData, checklists: SOChecklist[] = []): ServiceOrder {
  return {
    id,
    number: data.number ?? '',
    demandId: data.demandId ?? '',
    demand: data.demand ?? { id: data.demandId ?? '', number: data.demandNumber ?? '', title: data.demandTitle ?? '' },
    title: data.title ?? '',
    description: data.description ?? '',
    executorId: data.executorId ?? undefined,
    executor: data.executor ?? (data.executorId ? { id: data.executorId, name: data.executorName ?? '', email: data.executorEmail ?? '' } : undefined),
    status: data.status ?? 'OPEN',
    startDate: data.startDate ? tsToIso(data.startDate) : undefined,
    endDate: data.endDate ? tsToIso(data.endDate) : undefined,
    signature: data.signature ?? undefined,
    notes: data.notes ?? undefined,
    checklists,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

async function getNextSONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const q = query(
    collection(db, 'serviceOrders') as CollectionReference<DocumentData>,
    orderBy('number', 'desc'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return `OS-${year}-00001`;
  const lastNumber: string = snap.docs[0].data().number ?? `OS-${year}-00000`;
  const parts = lastNumber.split('-');
  const lastSeq = parseInt(parts[2] ?? '0', 10);
  const nextSeq = String(lastSeq + 1).padStart(5, '0');
  return `OS-${year}-${nextSeq}`;
}

async function fetchChecklists(soId: string): Promise<SOChecklist[]> {
  const snap = await getDocs(
    query(collection(db, 'serviceOrders', soId, 'checklists'), orderBy('sortOrder', 'asc')),
  );
  return snap.docs.map((c) => ({
    id: c.id,
    serviceOrderId: soId,
    item: c.data().item ?? '',
    completed: c.data().completed ?? false,
    completedAt: c.data().completedAt ? tsToIso(c.data().completedAt) : undefined,
    sortOrder: c.data().sortOrder ?? 0,
  }));
}

export const serviceOrdersService = {
  async findAll(params?: Record<string, string>): Promise<PaginatedResponse<ServiceOrder>> {
    const constraints = [];
    if (params?.status) constraints.push(where('status', '==', params.status));
    if (params?.demandId) constraints.push(where('demandId', '==', params.demandId));
    if (params?.executorId) constraints.push(where('executorId', '==', params.executorId));

    const q =
      constraints.length > 0
        ? query(collection(db, 'serviceOrders'), ...constraints, orderBy('createdAt', 'desc'))
        : query(collection(db, 'serviceOrders'), orderBy('createdAt', 'desc'));

    const snap = await getDocs(q);
    let orders = snap.docs.map((d) => docToSO(d.id, d.data()));

    if (params?.search) {
      const search = params.search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.title.toLowerCase().includes(search) ||
          o.number.toLowerCase().includes(search) ||
          o.description.toLowerCase().includes(search),
      );
    }

    const page = Number(params?.page ?? 1);
    const pageLimit = Number(params?.limit ?? 20);
    const total = orders.length;
    const start = (page - 1) * pageLimit;
    const paginated = orders.slice(start, start + pageLimit);

    return {
      success: true,
      data: paginated,
      pagination: { page, limit: pageLimit, total, totalPages: Math.ceil(total / pageLimit) },
    };
  },

  async findById(id: string): Promise<ServiceOrder> {
    const snap = await getDoc(doc(db, 'serviceOrders', id));
    if (!snap.exists()) throw new Error('Service order not found');
    const checklists = await fetchChecklists(id);
    return docToSO(snap.id, snap.data(), checklists);
  },

  async create(payload: Record<string, unknown>): Promise<ServiceOrder> {
    const now = Timestamp.fromDate(new Date());
    const number = await getNextSONumber();

    const checklistItems = (payload.checklists as Array<{ item: string; sortOrder?: number }>) ?? [];
    const { checklists: _cl, ...rest } = payload;
    void _cl;

    const docData = {
      ...rest,
      number,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    };

    const ref = await addDoc(collection(db, 'serviceOrders'), docData);

    // Create checklist items as subcollection docs
    for (let i = 0; i < checklistItems.length; i++) {
      const item = checklistItems[i];
      await addDoc(collection(db, 'serviceOrders', ref.id, 'checklists'), {
        item: item.item ?? '',
        completed: false,
        sortOrder: item.sortOrder ?? i,
      });
    }

    return this.findById(ref.id);
  },

  async update(id: string, payload: Record<string, unknown>): Promise<ServiceOrder> {
    const { checklists: _cl, ...rest } = payload;
    void _cl;
    await updateDoc(doc(db, 'serviceOrders', id), {
      ...rest,
      updatedAt: Timestamp.fromDate(new Date()),
    });
    return this.findById(id);
  },

  async updateStatus(id: string, status: string): Promise<ServiceOrder> {
    const now = Timestamp.fromDate(new Date());
    const updateData: Record<string, unknown> = { status, updatedAt: now };
    if (status === 'COMPLETED') updateData.endDate = now;
    await updateDoc(doc(db, 'serviceOrders', id), updateData);
    return this.findById(id);
  },

  async updateChecklist(soId: string, checklistId: string, completed: boolean): Promise<unknown> {
    const now = Timestamp.fromDate(new Date());
    await updateDoc(doc(db, 'serviceOrders', soId, 'checklists', checklistId), {
      completed,
      completedAt: completed ? now : null,
    });
    await updateDoc(doc(db, 'serviceOrders', soId), { updatedAt: now });
    return { success: true };
  },
};
