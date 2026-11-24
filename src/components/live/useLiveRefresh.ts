import { useEffect, useRef, useState } from 'react';

export const LIVE_INTERVAL_MS = 20_000;

/**
 * Re-runs `refresh` in the background every 20 seconds while the page is open, pauses while the
 * tab is hidden, and catches up as soon as the tab is visible again. Returns when it last
 * succeeded and whether it's paused, for <LiveIndicator>.
 *
 * `refresh` can be a new function on every render: the latest one is always used, and the timer
 * is not restarted.
 */
export function useLiveRefresh(refresh: (() => Promise<unknown>) | undefined, intervalMs = LIVE_INTERVAL_MS) {
  const [lastUpdated, setLastUpdated] = useState<number | null>(() => Date.now());
  const [paused, setPaused] = useState(() => typeof document !== 'undefined' && document.hidden);
  const latest = useRef(refresh);
  latest.current = refresh;
  const enabled = !!refresh;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let running = false;
    const run = async () => {
      if (document.hidden || running || !latest.current) return;
      running = true;
      try {
        await latest.current();
        if (!cancelled) setLastUpdated(Date.now());
      } catch {
        // keep showing the last good data; the next tick retries
      } finally {
        running = false;
      }
    };
    const timer = window.setInterval(run, intervalMs);
    const onVisibility = () => {
      setPaused(document.hidden);
      if (!document.hidden) run();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs]);

  return { lastUpdated, paused };
}
