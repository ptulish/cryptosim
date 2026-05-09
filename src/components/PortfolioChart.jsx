import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatUSD } from '../utils/format.js';
import { STARTING_BALANCE } from '../store/portfolioStore.js';

function TimeTick({ x, y, payload }) {
  const date = new Date(payload.value);
  const label = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <text
      x={x}
      y={y + 12}
      textAnchor="middle"
      fill="#64748b"
      fontSize={11}
      className="num-tabular"
    >
      {label}
    </text>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border-strong bg-bg-elevated/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <div className="text-slate-400">
        {new Date(point.ts).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-slate-100 num-tabular">
        {formatUSD(point.equity)}
      </div>
    </div>
  );
}

export function PortfolioChart({ data }) {
  const hasData = data && data.length > 1;
  const last = hasData ? data[data.length - 1].equity : STARTING_BALANCE;
  const positive = last >= STARTING_BALANCE;
  const stroke = positive ? '#22c55e' : '#f87171';

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Make a trade to start tracking your equity curve.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f2230" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="ts"
            tick={<TimeTick />}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={48}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickFormatter={(v) => formatUSD(v).replace('.00', '')}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#2a2e3f' }} />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={stroke}
            strokeWidth={2}
            fill="url(#equity-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
