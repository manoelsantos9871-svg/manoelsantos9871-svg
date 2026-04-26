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
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task, PaginatedResponse, ApiResponse } from '@/types';

function tsToIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function docToTask(id: string, data: DocumentData): Task {
  return {
    id,
    demandId: data.demandId ?? '',
    demand: data.demand ?? { id: data.demandId ?? '', number: data.demandNumber ?? '', title: data.demandTitle ?? '' },
    title: data.title ?? '',
    description: data.description ?? undefined,
    assignedToId: data.assignedToId ?? undefined,
    assignedTo: data.assignedTo ?? (data.assignedToId ? { id: data.assignedToId, name: data.assignedToName ?? '', email: data.assignedToEmail ?? '' } : undefined),
    dueDate: data.dueDate ? tsToIso(data.dueDate) : undefined,
    status: data.status ?? 'PENDING',
    timeSpent: data.timeSpent ?? 0,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
    _count: data._count ?? { comments: 0, attachments: 0 },
  };
}

export const tasksService = {
  async findAll(params?: Record<string, string | number>): Promise<PaginatedResponse<Task>> {
    const constraints = [];
    if (params?.demandId) constraints.push(where('demandId', '==', params.demandId));
    if (params?.status) constraints.push(where('status', '==', params.status));
    if (params?.assignedToId) constraints.push(where('assignedToId', '==', params.assignedToId));

    const q =
      constraints.length > 0
        ? query(collection(db, 'tasks'), ...constraints, orderBy('createdAt', 'desc'))
        : query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));

    const snap = await getDocs(q);
    let tasks = snap.docs.map((d) => docToTask(d.id, d.data()));

    if (params?.search && typeof params.search === 'string') {
      const search = params.search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(search) ||
          (t.description ?? '').toLowerCase().includes(search),
      );
    }

    const page = Number(params?.page ?? 1);
    const pageLimit = Number(params?.limit ?? 20);
    const total = tasks.length;
    const start = (page - 1) * pageLimit;
    const paginated = tasks.slice(start, start + pageLimit);

    return {
      success: true,
      data: paginated,
      pagination: { page, limit: pageLimit, total, totalPages: Math.ceil(total / pageLimit) },
    };
  },

  async findById(id: string): Promise<Task> {
    const snap = await getDoc(doc(db, 'tasks', id));
    if (!snap.exists()) throw new Error('Task not found');
    const task = docToTask(snap.id, snap.data());

    // Fetch comments subcollection
    const commentsSnap = await getDocs(
      query(collection(db, 'tasks', id, 'comments'), orderBy('createdAt', 'asc')),
    );
    task.comments = commentsSnap.docs.map((c) => ({
      id: c.id,
      content: c.data().content ?? '',
      author: c.data().author ?? { id: '', name: '' },
      createdAt: tsToIso(c.data().createdAt),
    }));

    // Fetch timeEntries subcollection
    const timeSnap = await getDocs(
      query(collection(db, 'tasks', id, 'timeEntries'), orderBy('createdAt', 'desc')),
    );
    task.timeEntries = timeSnap.docs.map((t) => ({
      id: t.id,
      minutes: t.data().minutes ?? 0,
      description: t.data().description ?? undefined,
      startedAt: tsToIso(t.data().startedAt),
      user: t.data().user ?? { id: '', name: '' },
      createdAt: tsToIso(t.data().createdAt),
    }));

    return task;
  },

  async create(payload: Record<string, unknown>): Promise<Task> {
    const now = Timestamp.fromDate(new Date());
    const docData = {
      ...payload,
      status: 'PENDING',
      timeSpent: 0,
      createdAt: now,
      updatedAt: now,
      _count: { comments: 0, attachments: 0 },
    };
    const ref = await addDoc(collection(db, 'tasks'), docData);
    return this.findById(ref.id);
  },

  async update(id: string, payload: Record<string, unknown>): Promise<Task> {
    await updateDoc(doc(db, 'tasks', id), {
      ...payload,
      updatedAt: Timestamp.fromDate(new Date()),
    });
    return this.findById(id);
  },

  async updateStatus(id: string, status: string, _reason?: string): Promise<Task> {
    const now = Timestamp.fromDate(new Date());
    const updateData: Record<string, unknown> = { status, updatedAt: now };
    await updateDoc(doc(db, 'tasks', id), updateData);
    return this.findById(id);
  },

  async logTime(
    id: string,
    minutes: number,
    description: string,
    startedAt: string,
    userId?: string,
    userName?: string,
  ): Promise<void> {
    const now = Timestamp.fromDate(new Date());
    await addDoc(collection(db, 'tasks', id, 'timeEntries'), {
      minutes,
      description,
      startedAt: Timestamp.fromDate(new Date(startedAt)),
      user: { id: userId ?? '', name: userName ?? '' },
      createdAt: now,
    });
    // Update aggregate timeSpent
    const snap = await getDoc(doc(db, 'tasks', id));
    if (snap.exists()) {
      const current = snap.data().timeSpent ?? 0;
      await updateDoc(doc(db, 'tasks', id), { timeSpent: current + minutes, updatedAt: now });
    }
  },

  async addComment(
    id: string,
    content: string,
    authorId?: string,
    authorName?: string,
  ): Promise<ApiResponse<unknown>> {
    const now = Timestamp.fromDate(new Date());
    const ref = await addDoc(collection(db, 'tasks', id, 'comments'), {
      content,
      author: { id: authorId ?? '', name: authorName ?? '' },
      createdAt: now,
    });
    const snap = await getDoc(doc(db, 'tasks', id));
    if (snap.exists()) {
      const count = snap.data()._count ?? { comments: 0, attachments: 0 };
      await updateDoc(doc(db, 'tasks', id), {
        _count: { ...count, comments: (count.comments ?? 0) + 1 },
        updatedAt: now,
      });
    }
    return { success: true, data: { id: ref.id } };
  },
};
