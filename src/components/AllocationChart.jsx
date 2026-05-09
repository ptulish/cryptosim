import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { formatPercent, formatUSD } from '../utils/format.js';

const PALETTE = [
  '#22c55e', // brand green
  '#8b5cf6', // accent purple
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#a855f7', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
];
const CASH_COLOR = '#475569'; // slate

/**
 * Donut chart of portfolio composition: every held position + remaining cash.
 *
 * The legend is intentionally rendered as a normal flex list (not Recharts'
 * built-in legend) so we can show value + percentage on each row and have
 * full control over typography.
 */
export function AllocationChart({ positions, cash, totalEquity }) {
  const data = useMemo(() => {
    const slices = positions
      .map((p, idx) => ({
        id: p.id,
        name: p.name,
        symbol: p.symbol,
        image: p.image,
        value: p.value,
        color: PALETTE[idx % PALETTE.length],
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);

    if (cash > 0) {
      slices.push({
        id: '__cash',
        name: 'Cash',
        symbol: 'USD',
        image: null,
        value: cash,
        color: CASH_COLOR,
        isCash: true,
      });
    }
    return slices;
  }, [positions, cash]);

  const total = totalEquity || data.reduce((sum, s) => sum + s.value, 0);

  if (data.length === 0 || total <= 0) {
    return <Empty />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
      <div className="relative h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={1.5}
              stroke="#0a0b10"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((s) => (
                <Cell key={s.id} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Total
          </div>
          <div className="text-base font-semibold num-tabular text-slate-100">
            {formatUSD(total)}
          </div>
          <div className="text-[10px] text-slate-500">
            {data.length} slice{data.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {data.map((slice) => {
          const pct = (slice.value / total) * 100;
          return (
            <li
              key={slice.id}
              className="flex items-center gap-3 text-sm"
              title={`${slice.name} · ${formatPercent(pct)}`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.image ? (
                <img
                  src={slice.image}
                  alt=""
                  className="h-5 w-5 rounded-full"
                  loading="lazy"
                />
              ) : (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-bg-elevated text-[9px] font-semibold text-slate-300">
                  $
                </span>
              )}
              <span className="flex-1 truncate text-slate-200">
                {slice.name}
                <span className="ml-1.5 text-xs text-slate-500">
                  {slice.symbol.toUpperCase()}
                </span>
              </span>
              <span className="num-tabular text-xs text-slate-400">
                {formatUSD(slice.value)}
              </span>
              <span className="w-12 text-right num-tabular text-xs font-medium text-slate-200">
                {pct.toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DonutTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  const pct = (slice.value / total) * 100;
  return (
    <div className="rounded-lg border border-border-strong bg-bg-elevated/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: slice.color }}
        />
        <span className="font-medium text-slate-100">{slice.name}</span>
      </div>
      <div className="mt-1 num-tabular text-slate-400">
        {formatUSD(slice.value)}{' '}
        <span className="text-slate-500">· {formatPercent(pct)}</span>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-44 flex-col items-center justify-center text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-bg-elevated">
        <PieIcon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 max-w-xs text-xs text-slate-500">
        Allocation appears here once you hold at least one position or some
        cash.
      </p>
    </div>
  );
}
