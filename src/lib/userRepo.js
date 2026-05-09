// User repository — thin wrapper over Supabase Auth. Keeps the same public
// shape the rest of the app already expects: a "public user" object with
// `{ id, email, displayName, createdAt }`. Password material never enters
// this module — Supabase hashes and stores credentials server-side.
//
// This file is intentionally the only place outside `src/lib/supabase.js`
// that talks to Supabase Auth, so a future swap (Auth.js, Clerk, …) only
// touches one module.

import { supabase } from './supabase.js';

/**
 * Maps a Supabase auth user into the lightweight public record the UI uses.
 * Returns `null` when the input is null/undefined so callers can pipe
 * directly from `getSession`.
 */
export function toPublicUser(authUser) {
  if (!authUser) return null;
  const meta = authUser.user_metadata ?? {};
  const fallback = (authUser.email ?? '').split('@')[0] || 'trader';
  return {
    id: authUser.id,
    email: authUser.email ?? '',
    displayName: meta.display_name || fallback,
    createdAt: authUser.created_at ? Date.parse(authUser.created_at) : Date.now(),
  };
}

function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function registerUser({ email, password, displayName }) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('Email is required.');
  if (!isValidEmail(normalized)) throw new Error('Email looks invalid.');
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const trimmedName = (displayName ?? '').trim();
  const { data, error } = await supabase.auth.signUp({
    email: normalized,
    password,
    options: {
      data: {
        display_name: trimmedName || normalized.split('@')[0],
      },
    },
  });

  if (error) throw new Error(prettifyAuthError(error));
  if (!data.user) {
    throw new Error('Could not create account — please try again.');
  }
  // When email confirmation is enabled in the Supabase dashboard, `data.session`
  // is null until the user clicks the link. Surface that to the caller so the
  // UI can show "check your inbox" instead of pretending the user is signed in.
  if (!data.session) {
    throw new Error(
      'Account created — check your email to confirm before signing in.',
    );
  }
  return toPublicUser(data.user);
}

export async function authenticate({ email, password }) {
  const normalized = normalizeEmail(email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) throw new Error(prettifyAuthError(error));
  return toPublicUser(data.user);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(prettifyAuthError(error));
}

export async function updateProfile(patch) {
  const data = {};
  if (typeof patch?.displayName === 'string') {
    data.display_name = patch.displayName.trim();
  }
  const { data: result, error } = await supabase.auth.updateUser({ data });
  if (error) throw new Error(prettifyAuthError(error));
  return toPublicUser(result.user);
}

/** Resolves the currently signed-in public user, or null. */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return toPublicUser(data.session?.user);
}

/**
 * Subscribes to auth state changes. The callback receives the public user
 * (or null on sign-out). Returns an unsubscribe function.
 */
export function subscribeAuth(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(toPublicUser(session?.user));
  });
  return () => data.subscription.unsubscribe();
}

/** Translate Supabase's terse error messages into something user-friendly. */
function prettifyAuthError(error) {
  const msg = error?.message ?? 'Authentication failed.';
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Wrong email or password — try again.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  return msg;
}
