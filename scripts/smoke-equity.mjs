// Smoke test for the multi-resolution equity history compaction.
// Verifies that the bucket strategy actually thins old samples while keeping
// recent ones dense. Run via: node scripts/smoke-equity.mjs

import { compactEquityHistory } from '../src/store/portfolioStore.js';

const now = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Build 31 days of synthetic samples, one every 60 seconds. That's > 44k
// points — way more than we'd ever store in real life.
const dense = [];
const start = now - 31 * DAY;
for (let t = start; t <= now; t += 60 * 1000) {
  dense.push({ ts: t, equity: 10_000 + Math.sin(t / 1e7) * 500 });
}

const compacted = compactEquityHistory(dense, now);

console.assert(
  compacted.length < 1000,
  `expected compacted history under 1000 points, got ${compacted.length}`,
);

// Last point survives.
console.assert(
  compacted[compacted.length - 1].ts === dense[dense.length - 1].ts,
  'newest sample should always survive',
);

// Density check: in the last hour we should have plenty of points.
const lastHour = compacted.filter((s) => now - s.ts < HOUR);
console.assert(
  lastHour.length >= 30 && lastHour.length <= 130,
  `last hour density off: ${lastHour.length}`,
);

// Older-than-week points should be sparse: at most ~4 per day for older
// than 7 days, since the bucket is 6h.
const old = compacted.filter((s) => now - s.ts > 7 * DAY);
const days = 31 - 7;
console.assert(
  old.length <= days * 4 + 5,
  `pre-week density too dense: ${old.length}`,
);

// Sanity: array stays sorted ascending.
for (let i = 1; i < compacted.length; i += 1) {
  console.assert(compacted[i].ts >= compacted[i - 1].ts, 'order preserved');
}

console.log(
  `equity smoke: OK · ${dense.length} → ${compacted.length} samples (` +
    `last hour: ${lastHour.length}, pre-week: ${old.length})`,
);
