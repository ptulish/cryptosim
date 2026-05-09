import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from './Modal.jsx';
import { PriceTag } from './PriceTag.jsx';
import {
  useMyCash,
  useMyHolding,
  useMyTradingActions,
} from '../store/portfolioStore.js';
import { formatAmount, formatUSD } from '../utils/format.js';

/**
 * Buy / Sell modal. The mode is implicit in `side`. We accept either USD
 * amount or token amount via two coupled inputs.
 */
export function TradeModal({ open, onClose, coin, side, livePrice }) {
  const cash = useMyCash();
  const holding = useMyHolding(coin?.id);
  const { buy, sell } = useMyTradingActions();

  const price = livePrice ?? coin?.current_price ?? 0;
  const isBuy = side === 'buy';

  const [usdInput, setUsdInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [lastEdited, setLastEdited] = useState('usd');

  // Reset inputs whenever the modal opens for a different coin / side.
  useEffect(() => {
    if (!open) return;
    setUsdInput('');
    setAmountInput('');
    setLastEdited('usd');
  }, [open, coin?.id, side]);

  // Keep the two inputs in sync as the price ticks.
  useEffect(() => {
    if (!open || !price) return;
    if (lastEdited === 'usd') {
      const usd = Number.parseFloat(usdInput);
      if (Number.isFinite(usd)) {
        setAmountInput(stripTrailingZeros((usd / price).toFixed(8)));
      }
    } else {
      const amt = Number.parseFloat(amountInput);
      if (Number.isFinite(amt)) {
        setUsdInput((amt * price).toFixed(2));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, open]);

  const onUsdChange = (v) => {
    setUsdInput(v);
    setLastEdited('usd');
    const usd = Number.parseFloat(v);
    if (!Number.isFinite(usd) || !price) {
      setAmountInput('');
      return;
    }
    setAmountInput(stripTrailingZeros((usd / price).toFixed(8)));
  };

  const onAmountChange = (v) => {
    setAmountInput(v);
    setLastEdited('amount');
    const amt = Number.parseFloat(v);
    if (!Number.isFinite(amt) || !price) {
      setUsdInput('');
      return;
    }
    setUsdInput((amt * price).toFixed(2));
  };

  const max = useMemo(() => {
    if (isBuy) return cash;
    return (holding?.amount ?? 0) * price;
  }, [isBuy, cash, holding, price]);

  const fillPercent = (pct) => {
    const usd = (max * pct) / 100;
    onUsdChange(usd.toFixed(2));
  };

  const handleSubmit = () => {
    const amount = Number.parseFloat(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    if (!price || !coin) return;

    const action = isBuy ? buy : sell;
    const result = action({ coin, amount, price });
    if (!result.ok) {
      toast.error(result.error ?? 'Order failed');
      return;
    }
    toast.success(
      `${isBuy ? 'Bought' : 'Sold'} ${formatAmount(amount)} ${coin.symbol.toUpperCase()} @ ${formatUSD(price)}`,
    );
    onClose?.();
  };

  if (!coin) return null;

  const usd = Number.parseFloat(usdInput) || 0;
  const overLimit = usd - max > 1e-6;
  const amount = Number.parseFloat(amountInput) || 0;
  const disabled = amount <= 0 || overLimit;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className={isBuy ? 'text-brand-400' : 'text-danger-400'}>
            {isBuy ? 'Buy' : 'Sell'}
          </span>
          <span className="text-slate-100">{coin.name}</span>
          <span className="text-xs text-slate-500">
            {coin.symbol.toUpperCase()}
          </span>
        </span>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={coin.image}
              alt=""
              className="h-8 w-8 rounded-full"
              loading="lazy"
            />
            <div>
              <div className="text-xs text-slate-400">Live price</div>
              <PriceTag value={price} className="text-base font-semibold" />
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>{isBuy ? 'Cash available' : 'You hold'}</div>
            <div className="num-tabular text-sm font-medium text-slate-200">
              {isBuy
                ? formatUSD(cash)
                : `${formatAmount(holding?.amount ?? 0)} ${coin.symbol.toUpperCase()}`}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Amount in USD
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={usdInput}
              onChange={(e) => onUsdChange(e.target.value)}
              placeholder="0.00"
              className="input pl-7 num-tabular"
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => fillPercent(pct)}
                className="rounded-md border border-border-subtle bg-bg-elevated/60 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-border-strong hover:text-slate-100"
              >
                {pct === 100 ? 'Max' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            {coin.symbol.toUpperCase()} amount
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amountInput}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            className="input num-tabular"
          />
        </div>

        {overLimit && (
          <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
            {isBuy
              ? 'Order exceeds your available cash.'
              : 'Order exceeds your holdings.'}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled}
            className={isBuy ? 'btn-primary' : 'btn-danger'}
          >
            {isBuy ? 'Confirm Buy' : 'Confirm Sell'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function stripTrailingZeros(s) {
  if (!s.includes('.')) return s;
  return s.replace(/\.?0+$/, '');
}
