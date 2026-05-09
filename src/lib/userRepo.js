// User repository — a thin wrapper over localStorage that pretends to be a
// users table. All persistence-layer assumptions are isolated here, so a
// future swap to Supabase or a REST backend only touches this file.

import { hashPassword, verifyPassword } from './passwordHash.js';

const STORAGE_KEY = 'cryptosim-users-v1';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeAll(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function userExists(email) {
  return Boolean(readAll()[normalizeEmail(email)]);
}

export function getPublicUser(email) {
  const u = readAll()[normalizeEmail(email)];
  if (!u) return null;
  const { hash, salt, iterations, algorithm, ...publicFields } = u;
  return publicFields;
}

export async function registerUser({ email, password, displayName }) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('Email is required.');
  if (!isValidEmail(normalized)) throw new Error('Email looks invalid.');
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const users = readAll();
  if (users[normalized]) {
    throw new Error('An account with this email already exists.');
  }

  const credentials = await hashPassword(password);
  const user = {
    id: genId(),
    email: normalized,
    displayName: (displayName ?? '').trim() || normalized.split('@')[0],
    createdAt: Date.now(),
    ...credentials,
  };
  users[normalized] = user;
  writeAll(users);
  return getPublicUser(normalized);
}

export async function authenticate({ email, password }) {
  const normalized = normalizeEmail(email);
  const users = readAll();
  const record = users[normalized];
  if (!record) throw new Error('No account found for that email.');
  const ok = await verifyPassword(password, record);
  if (!ok) throw new Error('Wrong password — try again.');
  return getPublicUser(normalized);
}

export function updateProfile(email, patch) {
  const normalized = normalizeEmail(email);
  const users = readAll();
  if (!users[normalized]) return null;
  users[normalized] = { ...users[normalized], ...patch };
  writeAll(users);
  return getPublicUser(normalized);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
