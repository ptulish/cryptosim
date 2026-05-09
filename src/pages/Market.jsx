import { useMemo, useState } from 'react';
import { Search, ArrowUpDown, AlertCircle } from 'lucide-react';
import { Sparkline } from '../components/Sparkline.jsx';
import { PriceTag } from '../components/PriceTag.jsx';
import { SkeletonRow } from '../components/Skeleton.jsx';
import { TradeModal } from '../components/TradeModal.jsx';
import { useMyHoldings } from '../store/portfolioStore.js';
import {
  classNames,
  formatCompactUSD,
  formatPercent,
} from '../utils/format.js';

const SORTS = {
  rank: { label: 'Rank', accessor: (c) => c.market_cap_rank ?? Infinity, dir: 'asc' },
  price: { label: 'Price', accessor: (c, prices) => prices?.[c.id]?.price ?? c.current_price, dir: 'desc' },
  change: {
    label: '24h',
    accessor: (c) => c.price_change_percentage_24h ?? 0,
    dir: 'desc',
  },
  cap: { label: 'Market Cap', accessor: (c) => c.market_cap ?? 0, dir: 'desc' },
};

export function Market({ coins, prices, loading, error, onRefresh }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('rank');
  const [sortDir, setSortDir] = useState('asc');
  const [trade, setTrade] = useState(null);
  const holdings = useMyHoldings();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = coins;
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q),
      );
    }
    const sort = SORTS[sortKey];
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = sort.accessor(a, prices);
      const bv = sort.accessor(b, prices);
      if (av === bv) return 0;
      return av > bv ? sign : -sign;
    });
  }, [coins, query, sortKey, sortDir, prices]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(SORTS[key].dir);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Market</h1>
          <p className="text-xs text-slate-500">
            {coins.length > 0
              ? `Top ${coins.length} by market cap · live ticks via Binance`
              : 'Loading market data…'}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Bitcoin, ETH…"
            className="input pl-9"
          />
        </div>
      </div>

      {error && <ErrorBanner error={error} onRetry={onRefresh} />}

      <div className="card-elevated overflow-hidden">
        <div className="grid grid-cols-12 gap-3 border-b border-border-subtle px-5 py-2.5 text-[11px] uppercase tracking-wide text-slate-500">
          <SortHeader
            className="col-span-4"
            label="Asset"
            active={sortKey === 'rank'}
            dir={sortDir}
            onClick={() => toggleSort('rank')}
          />
          <SortHeader
            className="col-span-2 justify-end"
            label="Price"
            active={sortKey === 'price'}
            dir={sortDir}
            onClick={() => toggleSort('price')}
            align="right"
          />
          <SortHeader
            className="col-span-2 justify-end"
            label="24h"
            active={sortKey === 'change'}
            dir={sortDir}
            onClick={() => toggleSort('change')}
            align="right"
          />
          <SortHeader
            className="col-span-2 justify-end"
            label="Market Cap"
            active={sortKey === 'cap'}
            dir={sortDir}
            onClick={() => toggleSort('cap')}
            align="right"
          />
          <div className="col-span-2 text-right">Trade</div>
        </div>

        <div className="divide-y divide-border-subtle">
          {loading && coins.length === 0
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            : filtered.map((coin) => (
                <CoinRow
                  key={coin.id}
                  coin={coin}
                  livePrice={prices[coin.id]?.price}
                  owned={!!holdings[coin.id]}
                  onTrade={(side) => setTrade({ coin, side })}
                />
              ))}

          {!loading && filtered.length === 0 && (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              No coins match "{query}".
            </div>
          )}
        </div>
      </div>

      <TradeModal
        open={!!trade}
        onClose={() => setTrade(null)}
        coin={trade?.coin}
        side={trade?.side}
        livePrice={trade ? prices[trade.coin?.id]?.price : undefined}
      />
    </div>
  );
}

function SortHeader({ label, active, dir, onClick, className, align }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'flex items-center gap-1 transition-colors hover:text-slate-200',
        align === 'right' && 'justify-end',
        active ? 'text-slate-200' : 'text-slate-500',
        className,
      )}
    >
      {label}
      <ArrowUpDown
        className={classNames(
          'h-3 w-3',
          active ? 'opacity-100' : 'opacity-40',
          active && dir === 'asc' && 'rotate-180',
        )}
      />
    </button>
  );
}

function CoinRow({ coin, livePrice, owned, onTrade }) {
  const change = coin.price_change_percentage_24h;
  const positive = (change ?? 0) >= 0;
  const sparkData = coin.sparkline_in_7d?.price;

  return (
    <div className="grid grid-cols-12 items-center gap-3 px-5 py-3.5 table-row-hover">
      <div className="col-span-4 flex items-center gap-3">
        <div className="text-xs text-slate-500 num-tabular w-6">
          {coin.market_cap_rank ?? '—'}
        </div>
        <img
          src={coin.image}
          alt=""
          className="h-8 w-8 rounded-full"
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-100">
            {coin.name}
            {owned && (
              <span className="rounded-md border border-accent-500/30 bg-accent-500/10 px-1.5 py-0.5 text-[10px] text-accent-400">
                Owned
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            {coin.symbol.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="col-span-2 text-right">
        <PriceTag value={livePrice ?? coin.current_price} className="text-sm" />
        {sparkData && (
          <div className="ml-auto mt-1 flex justify-end">
            <Sparkline
              data={sparkData}
              positive={positive}
              height={20}
              width={80}
            />
          </div>
        )}
      </div>

      <div
        className={classNames(
          'col-span-2 text-right num-tabular text-sm',
          positive ? 'text-brand-400' : 'text-danger-400',
        )}
      >
        {formatPercent(change)}
      </div>

      <div className="col-span-2 text-right num-tabular text-sm text-slate-300">
        {formatCompactUSD(coin.market_cap)}
      </div>

      <div className="col-span-2 flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onTrade('buy')}
          className="btn-primary h-8 px-3 text-xs"
        >
          Buy
        </button>
        {owned && (
          <button
            type="button"
            onClick={() => onTrade('sell')}
            className="btn-ghost h-8 px-3 text-xs text-danger-400"
          >
            Sell
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({ error, onRetry }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <div className="flex-1">
        <div className="font-medium text-danger-400">
          Couldn't load market data
        </div>
        <div className="text-xs text-danger-400/70">
          {error.message ?? 'Network error'}
        </div>
      </div>
      <button type="button" onClick={onRetry} className="btn-ghost h-8 px-3 text-xs">
        Retry
      </button>
    </div>
  );
}
