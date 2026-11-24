import React, { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../../utils/formatters';
import { usePrefersReducedMotion } from './useReducedMotion';

interface AnimatedNumberProps {
  value: number;
  /** Count up from 0 the first time it appears. */
  countUpOnMount?: boolean;
  /** Show a brief "+N" chip when the value goes up after the first render. */
  showIncrease?: boolean;
  durationMs?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A KPI number that counts to its new value instead of jumping, and briefly shows how much it
 * went up (e.g. "+3") when live data brings a higher figure. Static with reduced motion.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  countUpOnMount = true,
  showIncrease = false,
  durationMs = 900,
}) => {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced || !countUpOnMount ? value : 0);
  const [increase, setIncrease] = useState<{ amount: number; key: number } | null>(null);
  const fromRef = useRef(reduced || !countUpOnMount ? value : 0);
  const mountedRef = useRef(false);

  useEffect(() => {
    const from = fromRef.current;
    if (mountedRef.current && showIncrease && value > from) {
      setIncrease({ amount: value - from, key: Date.now() });
    }
    mountedRef.current = true;
    fromRef.current = value;

    if (reduced || from === value) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setShown(Math.round(from + (value - from) * easeOutCubic(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced, durationMs, showIncrease]);

  useEffect(() => {
    if (!increase) return;
    const t = window.setTimeout(() => setIncrease(null), 2600);
    return () => window.clearTimeout(t);
  }, [increase]);

  return (
    <span className="inline-flex items-baseline gap-2">
      <span>{formatNumber(shown)}</span>
      {increase && (
        <span
          key={increase.key}
          className="ve-increase-chip self-center inline-flex items-center h-5 px-1.5 rounded-full bg-ve-cyan/15 text-ve-navy text-xs font-semibold tabular-nums"
          aria-live="polite"
        >
          +{formatNumber(increase.amount)}
        </span>
      )}
    </span>
  );
};
