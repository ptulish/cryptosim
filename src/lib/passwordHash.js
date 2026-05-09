// Password hashing with PBKDF2 (SHA-256) via the Web Crypto API.
//
// This is *demo-grade* auth: a real product would do this on a server. But
// the structure is correct — random per-user salt, configurable iteration
// count, constant-time-ish comparison via deep equality on Uint8Arrays —
// so swapping the storage layer for Supabase / a real backend is a single
// file change inside `userRepo.js`.

const ITERATIONS = 120_000;
const KEY_LEN_BYTES = 32;

function bytesToBase64(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveBits(password, saltBytes, iterations) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const buffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBytes,
      iterations,
    },
    baseKey,
    KEY_LEN_BYTES * 8,
  );
  return new Uint8Array(buffer);
}

/**
 * Hashes a plaintext password with a freshly-generated 16-byte salt.
 * Returns a serializable record safe to store next to the user.
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(password, salt, ITERATIONS);
  return {
    algorithm: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: bytesToBase64(salt),
    hash: bytesToBase64(hash),
  };
}

/**
 * Verifies `password` against a previously-stored record. Uses a
 * length-constant comparison to discourage trivial timing attacks.
 */
export async function verifyPassword(password, record) {
  if (!record?.hash || !record?.salt) return false;
  const salt = base64ToBytes(record.salt);
  const expected = base64ToBytes(record.hash);
  const computed = await deriveBits(
    password,
    salt,
    record.iterations ?? ITERATIONS,
  );
  if (computed.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i += 1) {
    mismatch |= computed[i] ^ expected[i];
  }
  return mismatch === 0;
}
