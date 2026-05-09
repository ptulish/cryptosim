import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, History as HistoryIcon } from 'lucide-react';
import { useMyTrades } from '../store/portfolioStore.js';
import {
  classNames,
  formatAmount,
  formatDate,
  formatUSD,
} from '../utils/format.js';

const FILTERS = ['all', 'buy', 'sell'];

export function History() {
  const trades = useMyTrades();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    return trades.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [trades, filter, query]);

  const stats = useMemo(() => {
    let bought = 0;
    let sold = 0;
    for (const t of trades) {
      if (t.type === 'buy') bought += t.total;
      else sold += t.total;
    }
    return { bought, sold, count: trades.length };
  }, [trades]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Trade history</h1>
        <p className="text-xs text-slate-500">
          Every order you've placed on the simulator. Stored locally.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total trades" value={stats.count.toString()} />
        <StatCard label="Bought volume" value={formatUSD(stats.bought)} />
        <StatCard label="Sold volume" value={formatUSD(stats.sold)} />
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border-subtle px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg border border-border-subtle bg-bg-base/40 p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={classNames(
                  'rounded-md px-3 py-1 text-xs capitalize transition-colors',
                  filter === f
                    ? 'bg-bg-elevated text-slate-100'
                    : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by coin"
            className="input sm:w-60"
          />
        </div>

        {trades.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-5 py-2.5 font-medium">Type</th>
                  <th className="px-5 py-2.5 font-medium">Asset</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5 text-right font-medium">Price</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {visible.map((trade) => (
                  <tr key={trade.id} className="table-row-hover">
                    <td className="px-5 py-3 text-slate-400 num-tabular">
                      {formatDate(trade.ts)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          trade.type === 'buy' ? 'badge-up' : 'badge-down'
                        }
                      >
                        {trade.type === 'buy' ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {trade.type === 'buy' ? 'Buy' : 'Sell'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={trade.image}
                          alt=""
                          className="h-6 w-6 rounded-full"
                          loading="lazy"
                        />
                        <div>
                          <div className="font-medium text-slate-100">
                            {trade.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {trade.symbol.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right num-tabular">
                      {formatAmount(trade.amount)}
                    </td>
                    <td className="px-5 py-3 text-right num-tabular">
                      {formatUSD(trade.price)}
                    </td>
                    <td className="px-5 py-3 text-right num-tabular font-medium">
                      {formatUSD(trade.total)}
                    </td>
                  </tr>
                ))}

                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      No trades match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card-elevated p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold num-tabular">{value}</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-bg-elevated">
        <HistoryIcon className="h-5 w-5 text-slate-400" />
      </div>
      <h3 className="text-base font-medium text-slate-200">No trades yet</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Once you place a buy or sell, the order will show up here with full
        timestamps and pricing detail.
      </p>
    </div>
  );
}
