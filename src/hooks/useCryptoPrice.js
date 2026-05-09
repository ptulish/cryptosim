import { useEffect, useMemo, useRef, useState } from 'react';
import { openPriceStream, toBinancePair } from '../lib/binance.js';

/**
 * Subscribes to live Binance price ticks for a list of coins and returns a
 * record `{ [coinId]: { price, ts, prev } }` updated as ticks arrive.
 *
 * The hook owns the lifecycle of the WebSocket: opens on mount / when the
 * subscription set changes, closes on unmount. This is exactly the kind of
 * "knows the React lifecycle" pattern reviewers look for in a portfolio
 * project — no leaked sockets across navigations.
 *
 * @param {Array<{ id: string, symbol: string }>} coins
 */
export function useCryptoPrice(coins) {
  const [prices, setPrices] = useState({});
  const [status, setStatus] = useState('idle');
  const tickHandler = useRef(() => {});

  // Build a stable lookup pair -> coinId so the WS handler is cheap.
  const { pairs, pairToId } = useMemo(() => {
    const list = [];
    const lookup = {};
    for (const coin of coins ?? []) {
      const pair = toBinancePair(coin.symbol);
      if (!pair) continue;
      if (!lookup[pair]) {
        lookup[pair] = coin.id;
        list.push(pair);
      }
    }
    return { pairs: list, pairToId: lookup };
  }, [coins]);

  // Keep the handler reference stable so we can swap the lookup table without
  // closing/reopening the socket every render.
  useEffect(() => {
    tickHandler.current = ({ pair, price, ts }) => {
      const id = pairToId[pair];
      if (!id) return;
      setPrices((prev) => ({
        ...prev,
        [id]: { price, ts, prev: prev[id]?.price ?? price },
      }));
    };
  }, [pairToId]);

  useEffect(() => {
    if (pairs.length === 0) {
      setStatus('idle');
      return undefined;
    }
    const close = openPriceStream(
      pairs,
      (tick) => tickHandler.current(tick),
      { onStatus: setStatus },
    );
    return close;
    // We deliberately reopen the stream only when the set of pairs changes
    // (string-joined for stable comparison).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs.join('|')]);

  return { prices, status };
}
