import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, RefreshCw, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { AllocationChart } from '../components/AllocationChart.jsx';
import { AnimatedCounter } from '../components/AnimatedCounter.jsx';
import { PortfolioChart } from '../components/PortfolioChart.jsx';
import { PriceTag } from '../components/PriceTag.jsx';
import { RangeSelector, filterByRange } from '../components/RangeSelector.jsx';
import { Sparkline } from '../components/Sparkline.jsx';
import { SkeletonStat } from '../components/Skeleton.jsx';
import { TradeModal } from '../components/TradeModal.jsx';
import { Modal } from '../components/Modal.jsx';
import {
  STARTING_BALANCE,
  useMyTradingActions,
} from '../store/portfolioStore.js';
import {
  formatAmount,
  formatPercent,
  formatUSD,
  classNames,
} from '../utils/format.js';

export function Dashboard({ coinsById, prices, metrics, loading }) {
  const { reset } = useMyTradingActions();
  const [resetOpen, setResetOpen] = useState(false);
  const [trade, setTrade] = useState(null);
  const [range, setRange] = useState('1D');

  const positive = metrics.totalPnL >= 0;

  const visibleHistory = useMemo(
    () => filterByRange(metrics.equityHistory, range),
    [metrics.equityHistory, range],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-elevated lg:col-span-2 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                <Wallet className="h-3.5 w-3.5" />
                Total equity
              </div>
              <div className="mt-2 text-4xl font-bold tracking-tight num-tabular sm:text-5xl">
                <AnimatedCounter value={metrics.totalEquity} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span
                  className={classNames(
                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 num-tabular',
                    positive
                      ? 'bg-brand-500/10 text-brand-400'
                      : 'bg-danger-500/10 text-danger-400',
                  )}
                >
                  {positive ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {formatUSD(metrics.totalPnL)} (
                  {formatPercent(metrics.totalPnLPct)})
                </span>
                <span className="text-xs text-slate-500">
                  vs starting {formatUSD(STARTING_BALANCE)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="btn-ghost"
              title="Reset portfolio"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="mt-6 border-t border-border-subtle pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-slate-300">
                  Equity over time
                </h3>
                <p className="text-[11px] text-slate-500">
                  Sampled live · adaptive resolution to support 1M views
                </p>
              </div>
              <RangeSelector value={range} onChange={setRange} />
            </div>
            <PortfolioChart
              data={visibleHistory}
              hasAnyHistory={metrics.equityHistory.length > 1}
            />
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <>
              <SkeletonStat />
              <SkeletonStat />
            </>
          ) : (
            <>
              <StatCard
                label="Cash available"
                value={metrics.cash}
                hint="Buying power"
              />
              <StatCard
                label="Invested value"
                value={metrics.investedValue}
                hint={`${metrics.positions.length} position${
                  metrics.positions.length === 1 ? '' : 's'
                }`}
              />
            </>
          )}
        </div>
      </div>

      <section className="card-elevated p-5">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Allocation</h2>
            <p className="text-xs text-slate-500">
              How your equity is split across cash and holdings.
            </p>
          </div>
        </header>
        <AllocationChart
          positions={metrics.positions}
          cash={metrics.cash}
          totalEquity={metrics.totalEquity}
        />
      </section>

      <section className="card-elevated overflow-hidden">
        <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Your portfolio</h2>
            <p className="text-xs text-slate-500">
              Live valuation, average cost and unrealized P&amp;L.
            </p>
          </div>
          <Link to="/market" className="btn-ghost text-xs">
            Browse market
          </Link>
        </header>

        {metrics.positions.length === 0 ? (
          <EmptyPortfolio />
        ) : (
          <div className="divide-y divide-border-subtle">
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 text-[11px] uppercase tracking-wide text-slate-500">
              <div className="col-span-4">Asset</div>
              <div className="col-span-2 text-right">Holdings</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Value</div>
              <div className="col-span-2 text-right">P&amp;L</div>
            </div>
            {metrics.positions.map((p) => (
              <PositionRow
                key={p.id}
                position={p}
                coin={coinsById[p.id]}
                onTrade={(side) => setTrade({ coin: coinsById[p.id], side })}
                livePrice={prices[p.id]?.price}
              />
            ))}
          </div>
        )}
      </section>

      <TradeModal
        open={!!trade}
        onClose={() => setTrade(null)}
        coin={trade?.coin}
        side={trade?.side}
        livePrice={trade ? prices[trade.coin?.id]?.price : undefined}
      />

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset portfolio?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setResetOpen(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setResetOpen(false);
                toast.success('Portfolio reset to $10,000');
              }}
              className="btn-danger"
            >
              Reset everything
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-400">
          This wipes your cash, holdings, equity history and trade log. You'll
          start over with a fresh {formatUSD(STARTING_BALANCE)}.
        </p>
      </Modal>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="card-elevated p-5">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold num-tabular">
        <AnimatedCounter value={value} />
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function PositionRow({ position, coin, onTrade, livePrice }) {
  const positive = position.pnl >= 0;
  const sparkData = coin?.sparkline_in_7d?.price ?? null;
  const price = livePrice ?? position.price;

  return (
    <div className="grid grid-cols-12 items-center gap-3 px-5 py-3.5 table-row-hover">
      <div className="col-span-4 flex items-center gap-3">
        <img
          src={position.image}
          alt=""
          className="h-9 w-9 rounded-full"
          loading="lazy"
        />
        <div>
          <div className="font-medium text-slate-100">{position.name}</div>
          <div className="text-xs text-slate-500">
            {position.symbol.toUpperCase()} · avg {formatUSD(position.avgCost)}
          </div>
        </div>
      </div>
      <div className="col-span-2 text-right num-tabular text-sm">
        {formatAmount(position.amount)}
      </div>
      <div className="col-span-2 text-right">
        <PriceTag value={price} className="text-sm" />
        {sparkData && (
          <div className="ml-auto mt-1 hidden justify-end sm:flex">
            <Sparkline
              data={sparkData}
              positive={positive}
              height={22}
              width={80}
            />
          </div>
        )}
      </div>
      <div className="col-span-2 text-right num-tabular text-sm font-medium">
        {formatUSD(position.value)}
      </div>
      <div className="col-span-2 flex items-center justify-end gap-2">
        <div
          className={classNames(
            'text-right num-tabular text-sm',
            positive ? 'text-brand-400' : 'text-danger-400',
          )}
        >
          <div>{formatUSD(position.pnl)}</div>
          <div className="text-[11px]">{formatPercent(position.pnlPct)}</div>
        </div>
        <div className="hidden gap-1 md:flex">
          <button
            type="button"
            className="btn-ghost h-8 px-2 text-xs"
            onClick={() => onTrade('buy')}
          >
            Buy
          </button>
          <button
            type="button"
            className="btn-ghost h-8 px-2 text-xs text-danger-400"
            onClick={() => onTrade('sell')}
          >
            Sell
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyPortfolio() {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-bg-elevated">
        <Wallet className="h-5 w-5 text-slate-400" />
      </div>
      <h3 className="text-base font-medium text-slate-200">
        Your portfolio is empty
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Head over to the market and buy your first coin with virtual cash. All
        trades stay local — no real money involved.
      </p>
      <Link to="/market" className="btn-primary mt-4 inline-flex">
        Open market
      </Link>
    </div>
  );
}
