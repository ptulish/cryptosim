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
       * Records a single equity sample for the given user.
       *
       * Storage strategy is multi-resolution: we keep dense samples for the
       * recent past and progressively thin older history so the buffer never
       * grows unbounded but a 1-month chart still has shape.
       *
       *   age < 1h   → keep 1 sample per 30s
       *   age < 24h  → keep 1 sample per 5min
       *   age < 7d   → keep 1 sample per 1h
       *   age >= 7d  → keep 1 sample per 6h
       *
       * Compaction runs after every append, so localStorage stays bounded at
       * ~600 points (a few KB) regardless of how long the account has lived.
       */
      recordEquity(userId, equity) {
        if (!userId || !Number.isFinite(equity)) return;
        const now = Date.now();
        get()._writeSlice(userId, (s) => {
          const history = s.equityHistory;
          const last = history[history.length - 1];
          if (last && now - last.ts < 25_000) return s;
          const appended = [...history, { ts: now, equity }];
          const compacted = compactEquityHistory(appended, now);
          return { ...s, equityHistory: compacted };
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

/**
 * Returns the minimum gap (ms) we want between samples whose age is `ageMs`.
 * Older points become more spaced out; newer points stay dense.
 */
function bucketSizeForAge(ageMs) {
  if (ageMs < 60 * 60 * 1000) return 30 * 1000; // 30s for last hour
  if (ageMs < 24 * 60 * 60 * 1000) return 5 * 60 * 1000; // 5m for last day
  if (ageMs < 7 * 24 * 60 * 60 * 1000) return 60 * 60 * 1000; // 1h for last week
  return 6 * 60 * 60 * 1000; // 6h beyond
}

/**
 * Walks history newest-to-oldest, dropping any sample that lands inside the
 * same age bucket as a more recent one. Always keeps the freshest sample.
 *
 * Pure function — exported below for unit testing.
 */
export function compactEquityHistory(history, now = Date.now()) {
  if (!Array.isArray(history) || history.length <= 1) return history;
  const sorted = [...history].sort((a, b) => a.ts - b.ts);
  const reversed = sorted.reverse();
  const kept = [];
  let lastKeptTs = null;
  for (const sample of reversed) {
    if (lastKeptTs === null) {
      kept.push(sample);
      lastKeptTs = sample.ts;
      continue;
    }
    const ageOfPrev = now - lastKeptTs;
    const minGap = bucketSizeForAge(ageOfPrev);
    if (lastKeptTs - sample.ts >= minGap) {
      kept.push(sample);
      lastKeptTs = sample.ts;
    }
  }
  return kept.reverse();
}
