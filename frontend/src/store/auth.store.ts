import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: User) => void;
  setFirebaseUser: (firebaseUser: FirebaseUser | null) => void;
  logout: () => void;
  initialize: (firebaseUser: FirebaseUser | null, user: User | null) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  firebaseUser: null,
  isAuthenticated: false,
  loading: true,

  setUser: (user) => set({ user, isAuthenticated: true }),

  setFirebaseUser: (firebaseUser) =>
    set({ firebaseUser, isAuthenticated: !!firebaseUser }),

  logout: () =>
    set({
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      loading: false,
    }),

  initialize: (firebaseUser, user) =>
    set({
      firebaseUser,
      user,
      isAuthenticated: !!firebaseUser,
      loading: false,
    }),
}));
