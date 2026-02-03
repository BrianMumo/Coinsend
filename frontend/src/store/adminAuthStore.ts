import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Admin } from '../types';

interface AdminAuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
  setAuth: (token: string, admin: Admin) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      isAuthenticated: false,

      setAuth: (token, admin) =>
        set({
          token,
          admin,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          admin: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'coinsend-admin-auth',
    }
  )
);
