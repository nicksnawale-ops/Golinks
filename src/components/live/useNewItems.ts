import { useEffect, useRef, useState } from 'react';

const HIGHLIGHT_MS = 2600;

/**
 * Ids of items that arrived while the page was open (a link someone just created, a new audit
 * event), so their rows can glow briefly. Items already there when the page opened, or that only
 * reappear because a filter changed, are never flagged: an item counts as new only if it was
 * created after the page opened and hasn't been seen before.
 */
export function useNewItems<T>(items: T[], getId: (item: T) => string, getCreatedAt: (item: T) => string | null | undefined): Set<string> {
  const openedAt = useRef(Date.now());
  const seen = useRef<Set<string> | null>(null);
  const timers = useRef<number[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());

  const ids = items.map(getId);
  const key = ids.join('|');

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    }
    const added = items.filter((item) => {
      const id = getId(item);
      if (seen.current!.has(id)) return false;
      seen.current!.add(id);
      const created = Date.parse(getCreatedAt(item) || '');
      return Number.isFinite(created) && created >= openedAt.current - 2000;
    }).map(getId);
    if (!added.length) return;
    setFresh((prev) => new Set([...prev, ...added]));
    timers.current.push(
      window.setTimeout(() => {
        setFresh((prev) => {
          const next = new Set(prev);
          added.forEach((id) => next.delete(id));
          return next;
        });
      }, HIGHLIGHT_MS)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  return fresh;
}
