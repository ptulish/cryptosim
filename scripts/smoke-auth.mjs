// Smoke test for the auth path: hash a password, verify it, and exercise the
// in-memory user repository against a stubbed localStorage. Run via:
//   node scripts/smoke-auth.mjs

import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
}
globalThis.localStorage = new MemoryStorage();

const { hashPassword, verifyPassword } = await import('../src/lib/passwordHash.js');
const userRepo = await import('../src/lib/userRepo.js');

const password = 'super-secret-pw';
const record = await hashPassword(password);
console.assert(await verifyPassword(password, record), 'verify happy path');
console.assert(
  !(await verifyPassword('wrong', record)),
  'verify rejects wrong password',
);

const created = await userRepo.registerUser({
  email: 'Demo@Example.COM',
  password: 'hunter22',
  displayName: 'Demo',
});
console.assert(created.email === 'demo@example.com', 'email is normalized');
console.assert(!('hash' in created), 'hash is not exposed publicly');

let threw = false;
try {
  await userRepo.registerUser({ email: 'demo@example.com', password: 'hunter22' });
} catch (err) {
  threw = err.message.includes('already exists');
}
console.assert(threw, 'duplicate email rejected');

const ok = await userRepo.authenticate({
  email: 'demo@example.com',
  password: 'hunter22',
});
console.assert(ok.id === created.id, 'login returns matching user');

let badThrew = false;
try {
  await userRepo.authenticate({ email: 'demo@example.com', password: 'nope' });
} catch (err) {
  badThrew = err.message.toLowerCase().includes('wrong password');
}
console.assert(badThrew, 'wrong password rejected');

console.log('auth smoke test: OK');
