// Binance public combined-stream WebSocket helper.
// Docs: https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams
//
// We subscribe to `<symbol>@miniTicker` for each pair which pushes a small
// payload (~once per second) containing the latest close price `c`.

const BINANCE_WS = 'wss://stream.binance.com:9443/stream';

// Some CoinGecko symbols don't map 1:1 to Binance trading pairs. Add overrides
// here as needed; everything else assumes `${symbol}usdt`.
const SYMBOL_OVERRIDES = {
  // CoinGecko -> Binance
  iota: 'iotausdt',
  miota: 'iotausdt',
};

export function toBinancePair(symbol) {
  if (!symbol) return null;
  const lower = symbol.toLowerCase();
  if (SYMBOL_OVERRIDES[lower]) return SYMBOL_OVERRIDES[lower];
  // Stablecoins pegged to USD don't have a USDT pair on Binance.
  if (['usdt', 'usdc', 'busd', 'dai', 'tusd', 'fdusd'].includes(lower)) {
    return null;
  }
  return `${lower}usdt`;
}

/**
 * Opens a combined-stream WS subscribed to the given Binance pairs and invokes
 * `onTick({ pair, price, ts })` whenever a tick arrives. Returns a function to
 * close the socket cleanly.
 *
 * The connection auto-reconnects with exponential backoff if it drops.
 */
export function openPriceStream(pairs, onTick, { onStatus } = {}) {
  const unique = Array.from(new Set(pairs.filter(Boolean)));
  if (unique.length === 0) {
    return () => {};
  }

  let socket = null;
  let closed = false;
  let retry = 0;

  const connect = () => {
    if (closed) return;
    const streams = unique.map((p) => `${p}@miniTicker`).join('/');
    const url = `${BINANCE_WS}?streams=${streams}`;
    socket = new WebSocket(url);
    onStatus?.('connecting');

    socket.addEventListener('open', () => {
      retry = 0;
      onStatus?.('open');
    });

    socket.addEventListener('message', (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        const data = payload?.data;
        if (!data?.s || data.c === undefined) return;
        const pair = data.s.toLowerCase();
        const price = Number.parseFloat(data.c);
        if (!Number.isFinite(price)) return;
        onTick({ pair, price, ts: data.E ?? Date.now() });
      } catch {
        // ignore malformed frames
      }
    });

    socket.addEventListener('close', () => {
      onStatus?.('closed');
      if (closed) return;
      const delay = Math.min(1000 * 2 ** retry, 15_000);
      retry += 1;
      setTimeout(connect, delay);
    });

    socket.addEventListener('error', () => {
      onStatus?.('error');
      try {
        socket?.close();
      } catch {
        // ignore
      }
    });
  };

  connect();

  return () => {
    closed = true;
    try {
      socket?.close();
    } catch {
      // ignore
    }
  };
}
