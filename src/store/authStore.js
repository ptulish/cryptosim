import { create } from 'zustand';
import {
  authenticate,
  getCurrentUser,
  registerUser,
  signOut,
  subscribeAuth,
} from '../lib/userRepo.js';

/**
 * Auth session state, sourced from Supabase. Supabase already persists the
 * session in localStorage and refreshes the access token, so this store does
 * not use zustand's `persist` middleware — it just mirrors the Supabase
 * session into a synchronous, React-friendly slice.
 *
 * Lifecycle:
 *   - on creation, kicks off `getCurrentUser()` to hydrate any existing
 *     session, and subscribes to auth state changes for the lifetime of
 *     the page.
 *   - `status` is `'loading'` until the initial hydration completes, so
 *     `RequireAuth` can avoid bouncing the user to /login mid-refresh.
 */
export const useAuthStore = create((set) => ({
  user: null, // { id, email, displayName, createdAt } | null
  status: 'loading', // 'loading' | 'idle' | 'submitting'
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

  async logout() {
    try {
      await signOut();
    } catch {
      // Even if the network call fails, clear local state — the user wanted out.
    }
    set({ user: null, error: null });
  },

  clearError() {
    set({ error: null });
  },
}));

// ─── One-time bootstrap ─────────────────────────────────────────────────────
// Hydrate from any persisted Supabase session and keep the store in sync with
// future auth events (token refresh, sign-out from another tab, etc.).

if (typeof window !== 'undefined') {
  getCurrentUser()
    .then((user) => {
      useAuthStore.setState((s) => ({
        user,
        status: s.status === 'submitting' ? s.status : 'idle',
      }));
    })
    .catch(() => {
      useAuthStore.setState({ status: 'idle' });
    });

  subscribeAuth((user) => {
    useAuthStore.setState((s) => ({
      user,
      status: s.status === 'submitting' ? s.status : 'idle',
    }));
  });
}

export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useUserId = () => useAuthStore((s) => s.user?.id ?? null);
export const useAuthLoading = () => useAuthStore((s) => s.status === 'loading');
