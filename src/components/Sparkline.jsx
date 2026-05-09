import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

/**
 * Tiny inline chart for market rows / portfolio cards. Uses an area fill so
 * it reads well even at 60×24px.
 */
export function Sparkline({ data, positive = true, height = 36, width = 110 }) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }
  const points = data.map((y, i) => ({ x: i, y }));
  const stroke = positive ? '#22c55e' : '#f87171';
  const id = `spark-${stroke}-${data.length}-${data[0]}`;

  return (
    <div style={{ width, height }} className="num-tabular">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone"
            dataKey="y"
            stroke={stroke}
            strokeWidth={1.6}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
