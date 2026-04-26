import {
  signInWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

function docToUser(id: string, data: Record<string, unknown>): User {
  return {
    id,
    name: (data.name as string) ?? '',
    matricula: (data.matricula as string) ?? '',
    role: (data.role as User['role']) ?? 'REQUESTER',
    sector: (data.sector as string) ?? '',
    email: (data.email as string) ?? '',
    status: (data.status as User['status']) ?? 'ACTIVE',
    mfaEnabled: (data.mfaEnabled as boolean) ?? false,
    lastLoginAt: (data.lastLoginAt as string | null) ?? null,
    createdAt: (data.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (data.updatedAt as string) ?? new Date().toISOString(),
  };
}

export const authService = {
  async login(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      throw new Error('User document not found in Firestore');
    }
    const user = docToUser(snap.id, snap.data() as Record<string, unknown>);
    return { user, firebaseUser: credential.user };
  },

  async logout() {
    await signOut(auth);
  },

  async getMe(): Promise<User> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    if (!snap.exists()) throw new Error('User document not found');
    return docToUser(snap.id, snap.data() as Record<string, unknown>);
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) throw new Error('Not authenticated');
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  },

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email);
  },
};
