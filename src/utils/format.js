// Smart number formatting utilities so the UI looks polished across price ranges.

const usdLarge = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const usdSmall = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 6,
  minimumFractionDigits: 2,
});

/**
 * Formats a USD price. Tiny values (e.g. shitcoins) get more decimals so they
 * don't render as "$0.00".
 */
export function formatUSD(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (Math.abs(value) > 0 && Math.abs(value) < 1) return usdSmall.format(value);
  return usdLarge.format(value);
}

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

export function formatCompactUSD(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `$${compact.format(value)}`;
}

export function formatPercent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatAmount(value, digits = 6) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  // Strip trailing zeros while keeping enough significance for tiny holdings.
  return Number(value)
    .toLocaleString('en-US', {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    });
}

export function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}
