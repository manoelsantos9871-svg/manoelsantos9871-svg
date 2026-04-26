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
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { User, PaginatedResponse, ApiResponse } from '@/types';

function tsToIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function docToUser(id: string, data: DocumentData): User {
  return {
    id,
    name: (data.name as string) ?? '',
    matricula: (data.matricula as string) ?? '',
    role: (data.role as User['role']) ?? 'REQUESTER',
    sector: (data.sector as string) ?? '',
    email: (data.email as string) ?? '',
    status: (data.status as User['status']) ?? 'ACTIVE',
    mfaEnabled: (data.mfaEnabled as boolean) ?? false,
    lastLoginAt: data.lastLoginAt ? tsToIso(data.lastLoginAt) : null,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

export const usersService = {
  async findAll(params?: Record<string, string>): Promise<PaginatedResponse<User>> {
    const constraints = [];
    if (params?.status) constraints.push(where('status', '==', params.status));
    if (params?.role) constraints.push(where('role', '==', params.role));

    const q =
      constraints.length > 0
        ? query(collection(db, 'users'), ...constraints, orderBy('name', 'asc'))
        : query(collection(db, 'users'), orderBy('name', 'asc'));

    const snap = await getDocs(q);
    let users = snap.docs.map((d) => docToUser(d.id, d.data()));

    if (params?.search) {
      const search = params.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.matricula.toLowerCase().includes(search),
      );
    }

    const page = Number(params?.page ?? 1);
    const pageLimit = Number(params?.limit ?? 20);
    const total = users.length;
    const start = (page - 1) * pageLimit;
    const paginated = users.slice(start, start + pageLimit);

    return {
      success: true,
      data: paginated,
      pagination: { page, limit: pageLimit, total, totalPages: Math.ceil(total / pageLimit) },
    };
  },

  async findById(id: string): Promise<User> {
    const snap = await getDoc(doc(db, 'users', id));
    if (!snap.exists()) throw new Error('User not found');
    return docToUser(snap.id, snap.data());
  },

  /**
   * Creates a Firebase Auth account and a Firestore user document.
   * After creating the new account the function signs back in as the original
   * admin user using the credentials stored in `adminCredentials`.
   * If adminCredentials are not supplied, only the Firestore document is created
   * (the auth account will be created on first login via sendPasswordResetEmail).
   */
  async create(payload: Record<string, unknown>): Promise<User> {
    const now = Timestamp.fromDate(new Date());
    const email = payload.email as string;
    const tempPassword = payload.tempPassword as string | undefined;
    const adminEmail = payload._adminEmail as string | undefined;
    const adminPassword = payload._adminPassword as string | undefined;

    // Strip internal-only fields before writing to Firestore
    const { tempPassword: _tp, _adminEmail: _ae, _adminPassword: _ap, ...userData } = payload;
    void _tp; void _ae; void _ap;

    let uid: string | undefined;

    if (tempPassword) {
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, tempPassword);
        uid = credential.user.uid;

        // Re-authenticate as admin if credentials provided
        if (adminEmail && adminPassword) {
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        }
      } catch {
        // Fall through: create Firestore doc only, send reset email instead
        uid = undefined;
      }
    }

    const docData = {
      ...userData,
      status: userData.status ?? 'ACTIVE',
      mfaEnabled: false,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (uid) {
      // Use the Firebase Auth UID as the document ID
      await updateDoc(doc(db, 'users', uid), docData).catch(async () => {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', uid!), docData);
      });
      // Import setDoc to handle creation when the doc doesn't exist
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', uid), docData);
      return docToUser(uid, docData as DocumentData);
    }

    // No auth uid — create Firestore doc with auto-generated id then send reset email
    const ref = await addDoc(collection(db, 'users'), docData);
    if (email) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch {
        // Non-fatal
      }
    }
    return docToUser(ref.id, docData as DocumentData);
  },

  async update(id: string, payload: Record<string, unknown>): Promise<User> {
    const now = Timestamp.fromDate(new Date());
    await updateDoc(doc(db, 'users', id), { ...payload, updatedAt: now });
    return this.findById(id);
  },

  async updateStatus(id: string, status: string): Promise<User> {
    const now = Timestamp.fromDate(new Date());
    await updateDoc(doc(db, 'users', id), { status, updatedAt: now });
    return this.findById(id);
  },

  async resetPassword(_id: string, _password: string): Promise<void> {
    // With Firebase Auth the client cannot set another user's password.
    // Send a password-reset email instead.
    const snap = await getDoc(doc(db, 'users', _id));
    if (!snap.exists()) throw new Error('User not found');
    const email = snap.data().email as string;
    if (email) {
      await sendPasswordResetEmail(auth, email);
    }
  },

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  async getStats(): Promise<ApiResponse<unknown>> {
    const snap = await getDocs(collection(db, 'users'));
    const users = snap.docs.map((d) => d.data());
    const total = users.length;
    const active = users.filter((u) => u.status === 'ACTIVE').length;
    const byRole = users.reduce<Record<string, number>>((acc, u) => {
      const role = (u.role as string) ?? 'REQUESTER';
      acc[role] = (acc[role] ?? 0) + 1;
      return acc;
    }, {});
    return { success: true, data: { total, active, inactive: total - active, byRole } };
  },
};
