// Sanity check for the Supabase env vars. Reads `.env` from the repo root,
// validates the shape of the keys, then hits the project's auth settings
// endpoint to make sure the URL + anon key are actually accepted by Supabase.
//
// Usage:
//   node scripts/check-supabase.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, '..', '.env');

const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function fail(msg) {
  console.error(c.red('✗ ') + msg);
  process.exit(1);
}

function ok(msg) {
  console.log(c.green('✓ ') + msg);
}

function info(msg) {
  console.log(c.dim('  ' + msg));
}

let raw;
try {
  raw = readFileSync(envPath, 'utf8');
} catch {
  fail(`Could not read .env at ${envPath}\n  Did you run \`cp .env.example .env\` and fill it in?`);
}

const env = {};
for (const line of raw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

let url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url) fail('VITE_SUPABASE_URL is missing in .env');
if (!key) fail('VITE_SUPABASE_ANON_KEY is missing in .env');

if (url.includes('YOUR-PROJECT') || key.includes('YOUR-')) {
  fail('You left the placeholder values from .env.example — paste real keys.');
}

// Be forgiving: people often copy the URL from the Data API page which
// includes a `/rest/v1/` suffix, or the dashboard URL with extra paths.
// supabase-js wants just the base, so strip anything after `.supabase.co`.
const stripped = url.replace(/^(https:\/\/[a-z0-9-]+\.supabase\.co)\/?.*$/i, '$1');
if (stripped !== url) {
  console.warn(c.yellow('! ') + `Trimmed extra path from URL: ${url} → ${stripped}`);
  console.warn(c.yellow('  ') + 'Update .env to use the stripped URL so Vite uses the same value.');
  url = stripped;
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
  fail(`VITE_SUPABASE_URL doesn't look like a Supabase project URL: ${url}\n  Expected: https://<project-ref>.supabase.co`);
}
ok(`URL format OK (${url})`);

if (key.startsWith('sb_secret_')) {
  fail('You pasted the SECRET key into VITE_SUPABASE_ANON_KEY. That key must NEVER ship to the browser. Use the Publishable key (sb_publishable_…) instead.');
}

if (key.startsWith('sb_publishable_')) {
  ok('Key format looks like a new-style Publishable key (sb_publishable_…)');
} else if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
  ok('Key format looks like a legacy anon JWT (still supported)');
} else {
  console.warn(c.yellow('! ') + `Key doesn't match either known Supabase format. Will try it anyway.`);
}

const cleanUrl = url.replace(/\/$/, '');
const probe = `${cleanUrl}/auth/v1/settings`;
info(`Probing ${probe}`);

let res;
try {
  res = await fetch(probe, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
} catch (err) {
  fail(`Network error reaching Supabase: ${err.message}\n  Is the URL correct and your machine online?`);
}

if (res.status === 401 || res.status === 403) {
  const body = await res.text().catch(() => '');
  fail(`Supabase rejected the key (HTTP ${res.status}).\n  Body: ${body.slice(0, 200)}\n  Double-check the Publishable key was copied without truncation, and that the URL belongs to the SAME project.`);
}
if (res.status === 404) {
  fail(`Supabase returned 404 at ${probe}.\n  The URL is reachable but doesn't look like a Supabase project. Re-copy the Project URL.`);
}
if (!res.ok) {
  const body = await res.text().catch(() => '');
  fail(`Unexpected response ${res.status} from Supabase.\n  Body: ${body.slice(0, 200)}`);
}

let settings;
try {
  settings = await res.json();
} catch {
  fail('Supabase responded but with non-JSON. Probably wrong URL.');
}

ok('Supabase accepted the key — you are good to go.');
info(`External email auth enabled: ${settings?.external?.email ?? 'unknown'}`);
const confirmRequired = settings?.mailer_autoconfirm === false;
if (confirmRequired) {
  console.log(
    c.yellow('! ') +
      'Email confirmation is currently REQUIRED on this project.\n' +
      '  For dev convenience, turn it off in Authentication → Providers → Email → "Confirm email".',
  );
} else {
  ok('Email confirmation is disabled — sign-up will return a session immediately.');
}
