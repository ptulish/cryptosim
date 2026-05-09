import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useUserId } from './authStore.js';

export const STARTING_BALANCE = 10_000;

const emptySlice = () => ({
  cash: STARTING_BALANCE,
  holdings: {},
  trades: [],
  equityHistory: [],
});

/**
 * Per-user paper-trading wallet, keyed by userId. Persisted to localStorage
 * so positions survive a refresh and so multiple accounts on the same
 * device get fully isolated portfolios.
 *
 * Slice shape (per user):
 *   { cash, holdings, trades, equityHistory }
 *
 * Holding shape:
 *   { id, symbol, name, image, amount, avgCost }
 *
 * Trade shape:
 *   { id, ts, type: 'buy' | 'sell', coinId, symbol, name, image,
 *     amount, price, total }
 */
export const usePortfolioStore = create(
  persist(
    (set, get) => ({
      users: {}, // { [userId]: slice }

      _getSlice(userId) {
        return get().users[userId] ?? emptySlice();
      },

      _writeSlice(userId, patch) {
        set((state) => {
          const prev = state.users[userId] ?? emptySlice();
          const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
          return { users: { ...state.users, [userId]: next } };
        });
      },

      buy(userId, { coin, amount, price }) {
        if (!userId) return { ok: false, error: 'Sign in to trade.' };
        const slice = get()._getSlice(userId);
        const total = amount * price;
        if (total > slice.cash + 1e-9) {
          return { ok: false, error: 'Not enough cash for this order.' };
        }
        const prev = slice.holdings[coin.id];
        const nextAmount = (prev?.amount ?? 0) + amount;
        const nextCost = (prev?.avgCost ?? 0) * (prev?.amount ?? 0) + total;
        const avgCost = nextAmount > 0 ? nextCost / nextAmount : 0;

        get()._writeSlice(userId, (s) => ({
          ...s,
          cash: s.cash - total,
          holdings: {
            ...s.holdings,
            [coin.id]: {
              id: coin.id,
              symbol: coin.symbol,
              name: coin.name,
              image: coin.image,
              amount: nextAmount,
              avgCost,
            },
          },
          trades: [
            {
              id: cryptoRandomId(),
              ts: Date.now(),
              type: 'buy',
              coinId: coin.id,
              symbol: coin.symbol,
              name: coin.name,
              image: coin.image,
              amount,
              price,
              total,
            },
            ...s.trades,
          ].slice(0, 500),
        }));
        return { ok: true };
      },

      sell(userId, { coin, amount, price }) {
        if (!userId) return { ok: false, error: 'Sign in to trade.' };
        const slice = get()._getSlice(userId);
        const prev = slice.holdings[coin.id];
        if (!prev || prev.amount + 1e-12 < amount) {
          return { ok: false, error: 'Not enough holdings to sell.' };
        }
        const remaining = prev.amount - amount;
        const total = amount * price;

        get()._writeSlice(userId, (s) => {
          const holdings = { ...s.holdings };
          if (remaining <= 1e-12) {
            delete holdings[coin.id];
          } else {
            holdings[coin.id] = { ...prev, amount: remaining };
          }
          return {
            ...s,
            cash: s.cash + total,
            holdings,
            trades: [
              {
                id: cryptoRandomId(),
                ts: Date.now(),
                type: 'sell',
                coinId: coin.id,
                symbol: coin.symbol,
                name: coin.name,
                image: coin.image,
                amount,
                price,
                total,
              },
              ...s.trades,
            ].slice(0, 500),
          };
        });
        return { ok: true };
      },

      /**
       * Records a single equity sample for the given user. Throttled at the
       * call site to ~5s and capped to the last 720 points so localStorage
       * doesn't grow unbounded.
       */
      recordEquity(userId, equity) {
        if (!userId || !Number.isFinite(equity)) return;
        const now = Date.now();
        get()._writeSlice(userId, (s) => {
          const last = s.equityHistory[s.equityHistory.length - 1];
          if (last && now - last.ts < 4_000) return s;
          const next = [...s.equityHistory, { ts: now, equity }];
          if (next.length > 720) next.splice(0, next.length - 720);
          return { ...s, equityHistory: next };
        });
      },

      reset(userId) {
        if (!userId) return;
        get()._writeSlice(userId, () => emptySlice());
      },

      /** Drops a user's portfolio entirely (e.g. on account deletion). */
      forgetUser(userId) {
        if (!userId) return;
        set((state) => {
          const next = { ...state.users };
          delete next[userId];
          return { users: next };
        });
      },
    }),
    {
      name: 'cryptosim-portfolio-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ users: state.users }),
    },
  ),
);

// ─── Selector hooks scoped to the currently-signed-in user ───────────────────

const selectMine = (s, userId) => s.users[userId] ?? emptySlice();

export function useMyCash() {
  const userId = useUserId();
  return usePortfolioStore((s) => selectMine(s, userId).cash);
}

export function useMyHoldings() {
  const userId = useUserId();
  return usePortfolioStore((s) => selectMine(s, userId).holdings);
}

export function useMyTrades() {
  const userId = useUserId();
  return usePortfolioStore((s) => selectMine(s, userId).trades);
}

export function useMyEquityHistory() {
  const userId = useUserId();
  return usePortfolioStore((s) => selectMine(s, userId).equityHistory);
}

export function useMyHolding(coinId) {
  const userId = useUserId();
  return usePortfolioStore((s) =>
    coinId ? selectMine(s, userId).holdings[coinId] ?? null : null,
  );
}

/**
 * Returns trade actions auto-bound to the current user. Returns no-ops if
 * the user is signed out.
 */
export function useMyTradingActions() {
  const userId = useUserId();
  const buy = usePortfolioStore((s) => s.buy);
  const sell = usePortfolioStore((s) => s.sell);
  const reset = usePortfolioStore((s) => s.reset);
  const recordEquity = usePortfolioStore((s) => s.recordEquity);

  return {
    buy: (args) => buy(userId, args),
    sell: (args) => sell(userId, args),
    reset: () => reset(userId),
    recordEquity: (equity) => recordEquity(userId, equity),
  };
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
