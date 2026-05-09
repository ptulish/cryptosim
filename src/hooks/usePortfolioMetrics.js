import { useEffect, useMemo } from 'react';
import {
  STARTING_BALANCE,
  useMyCash,
  useMyEquityHistory,
  useMyHoldings,
  useMyTradingActions,
} from '../store/portfolioStore.js';
import { useUserId } from '../store/authStore.js';

/**
 * Computes a live snapshot of portfolio value using the latest prices, and
 * appends a sample to the equity history so the dashboard chart can show
 * "how rich did I get in the last 5 minutes".
 *
 * Scoped to the currently-signed-in user; returns zeroed metrics for
 * unauthenticated visitors so the UI never NaNs out.
 */
export function usePortfolioMetrics(prices, coinsById) {
  const userId = useUserId();
  const cash = useMyCash();
  const holdings = useMyHoldings();
  const equityHistory = useMyEquityHistory();
  const { recordEquity } = useMyTradingActions();

  const positions = useMemo(() => {
    return Object.values(holdings).map((h) => {
      const live = prices?.[h.id]?.price;
      const fallback = coinsById?.[h.id]?.current_price;
      const price = live ?? fallback ?? h.avgCost;
      const value = h.amount * price;
      const cost = h.amount * h.avgCost;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      return { ...h, price, value, cost, pnl, pnlPct };
    });
  }, [holdings, prices, coinsById]);

  const investedValue = positions.reduce((sum, p) => sum + p.value, 0);
  const totalEquity = cash + investedValue;
  const totalPnL = totalEquity - STARTING_BALANCE;
  const totalPnLPct = (totalPnL / STARTING_BALANCE) * 100;

  useEffect(() => {
    if (!userId) return;
    if (!Number.isFinite(totalEquity)) return;
    recordEquity(totalEquity);
    // recordEquity is identity-stable enough — guarding via userId + value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, totalEquity]);

  return {
    cash,
    positions,
    investedValue,
    totalEquity,
    totalPnL,
    totalPnLPct,
    equityHistory,
  };
}
