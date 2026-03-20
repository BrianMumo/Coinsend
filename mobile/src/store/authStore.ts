import { create } from 'zustand';
import { User } from '../types';
import { secureStorage } from '../utils/secureStorage';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (userData: Partial<User>) => void;
  logout: () => void;
  setBootstrapping: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isBootstrapping: true,

  setAuth: (token, user) => {
    secureStorage.saveToken(token);
    secureStorage.saveUser(user);
    set({ token, user, isAuthenticated: true });
  },

  updateUser: (userData) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    })),

  logout: () => {
    secureStorage.clearAll();
    set({ token: null, user: null, isAuthenticated: false });
  },

  setBootstrapping: (val) => set({ isBootstrapping: val }),
}));
