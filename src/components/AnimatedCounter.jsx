import { useEffect, useRef, useState } from 'react';
import { formatUSD } from '../utils/format.js';

/**
 * Tween-counts to `value` over `duration` ms using requestAnimationFrame.
 * We render it via the supplied `format` fn so the same primitive can drive
 * USD, percentages, etc.
 */
export function AnimatedCounter({
  value,
  format = formatUSD,
  duration = 600,
  className,
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(performance.now());
  const rafRef = useRef(null);

  useEffect(() => {
    if (!Number.isFinite(value)) return undefined;
    const from = fromRef.current ?? value;
    const start = performance.now();
    startRef.current = start;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (value - from) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
