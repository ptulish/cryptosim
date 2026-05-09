import { useEffect, useRef, useState } from 'react';
import { formatUSD, classNames } from '../utils/format.js';

/**
 * Shows a price and briefly flashes green/red whenever the value changes.
 * This is the "feels alive" detail that makes a paper-trading UI satisfying.
 */
export function PriceTag({ value, className }) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (!Number.isFinite(value) || !Number.isFinite(prevRef.current)) {
      prevRef.current = value;
      return undefined;
    }
    if (value === prevRef.current) return undefined;
    setFlash(value > prevRef.current ? 'up' : 'down');
    prevRef.current = value;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span
      className={classNames(
        'num-tabular transition-colors duration-300',
        flash === 'up' && 'text-brand-400',
        flash === 'down' && 'text-danger-400',
        !flash && 'text-slate-100',
        className,
      )}
    >
      {formatUSD(value)}
    </span>
  );
}
