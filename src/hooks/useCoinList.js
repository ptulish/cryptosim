import { useCallback, useEffect, useState } from 'react';
import { fetchTopCoins } from '../utils/api.js';

/**
 * Loads the top-N coins from CoinGecko and refreshes them every `refreshMs`.
 * Exposes `{ coins, loading, error, refresh }` and cancels in-flight requests
 * on unmount via AbortController so we don't update state on dead components.
 */
export function useCoinList({ perPage = 50, refreshMs = 60_000 } = {}) {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const load = async () => {
      try {
        setError(null);
        const data = await fetchTopCoins({
          perPage,
          signal: controller.signal,
        });
        if (cancelled) return;
        setCoins(data);
      } catch (err) {
        if (cancelled || err.name === 'AbortError') return;
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, refreshMs);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [perPage, refreshMs, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { coins, loading, error, refresh };
}
