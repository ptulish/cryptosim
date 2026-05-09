// Thin client for CoinGecko's public REST API. No API key required for the free
// tier, but it's rate-limited (~10 req/min) so we cache aggressively in hooks.

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

async function request(path, { signal } = {}) {
  const res = await fetch(`${COINGECKO_BASE}${path}`, {
    signal,
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(
      `CoinGecko ${res.status}: ${res.statusText || 'request failed'}`,
    );
  }
  return res.json();
}

/**
 * Fetches the top-N coins by market cap with 7d sparkline + 24h change.
 */
export function fetchTopCoins({ perPage = 50, signal } = {}) {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: String(perPage),
    page: '1',
    sparkline: 'true',
    price_change_percentage: '24h',
  });
  return request(`/coins/markets?${params.toString()}`, { signal });
}

/**
 * Fetches a single coin's market chart for the given number of days.
 * Returns { prices: [[ts, price], ...] }.
 */
export function fetchMarketChart(id, { days = 7, signal } = {}) {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    days: String(days),
  });
  return request(`/coins/${id}/market_chart?${params.toString()}`, { signal });
}
