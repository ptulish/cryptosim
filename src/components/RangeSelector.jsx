import { classNames } from '../utils/format.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const RANGES = [
  { id: '1H', label: '1H', windowMs: HOUR },
  { id: '1D', label: '1D', windowMs: DAY },
  { id: '1W', label: '1W', windowMs: 7 * DAY },
  { id: '1M', label: '1M', windowMs: 30 * DAY },
  { id: 'ALL', label: 'ALL', windowMs: null },
];

export function RangeSelector({ value, onChange }) {
  return (
    <div
      role="tablist"
      className="inline-flex gap-0.5 rounded-lg border border-border-subtle bg-bg-base/40 p-0.5"
    >
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          role="tab"
          aria-selected={value === r.id}
          onClick={() => onChange(r.id)}
          className={classNames(
            'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
            value === r.id
              ? 'bg-bg-elevated text-slate-100 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]'
              : 'text-slate-400 hover:text-slate-200',
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

/** Filters an equity history array to the given range id. */
export function filterByRange(history, rangeId) {
  if (!history || history.length === 0) return history ?? [];
  const range = RANGES.find((r) => r.id === rangeId);
  if (!range || !range.windowMs) return history;
  const cutoff = Date.now() - range.windowMs;
  return history.filter((s) => s.ts >= cutoff);
}
