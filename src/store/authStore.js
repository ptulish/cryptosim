import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  authenticate,
  registerUser,
} from '../lib/userRepo.js';

/**
 * Auth session state. Only persists the public user record — never any
 * password material — to localStorage so refreshes keep the user signed in.
 *
 * The slice is intentionally tiny so this is the natural place to swap in
 * a real auth provider (Supabase, NextAuth, Auth.js) without touching the
 * UI.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { id, email, displayName, createdAt } | null
      status: 'idle', // 'idle' | 'submitting'
      error: null,

      async login({ email, password }) {
        set({ status: 'submitting', error: null });
        try {
          const user = await authenticate({ email, password });
          set({ user, status: 'idle' });
          return { ok: true, user };
        } catch (err) {
          set({ status: 'idle', error: err.message });
          return { ok: false, error: err.message };
        }
      },

      async register({ email, password, displayName }) {
        set({ status: 'submitting', error: null });
        try {
          const user = await registerUser({ email, password, displayName });
          set({ user, status: 'idle' });
          return { ok: true, user };
        } catch (err) {
          set({ status: 'idle', error: err.message });
          return { ok: false, error: err.message };
        }
      },

      logout() {
        set({ user: null, error: null });
      },

      clearError() {
        set({ error: null });
      },
    }),
    {
      name: 'cryptosim-session-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useUserId = () => useAuthStore((s) => s.user?.id ?? null);
