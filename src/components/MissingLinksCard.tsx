import React, { useEffect, useState } from 'react';
import { Plus, SearchX, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { dismissMissingLink, getMissingLinks, MissingLinkRequest } from '../services/linkService';
import { formatNumber, formatRelativeTime } from '../utils/formatters';

interface MissingLinksCardProps {
  onCreate: (shortName: string) => void;
}

/** Admin card: go/<name> requests that matched nothing — the links people want but don't have. */
export const MissingLinksCard: React.FC<MissingLinksCardProps> = ({ onCreate }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<MissingLinkRequest[] | null>(null);

  useEffect(() => {
    getMissingLinks(10)
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const dismiss = async (name: string) => {
    try {
      await dismissMissingLink(name);
      setItems((prev) => prev?.filter((i) => i.shortName !== name) ?? null);
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <SearchX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>Most Requested Missing Links</span>
        </h3>
        <span className="text-[11px] text-slate-400">Admins only</span>
      </div>

      {!items ? (
        <div className="space-y-2 pt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="pt-4 text-sm text-slate-500 dark:text-slate-400">
          Nobody has typed a go link that doesn't exist yet. When they do, it shows up here.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.shortName} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  go/{item.shortName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatNumber(item.requestCount)} request{item.requestCount === 1 ? '' : 's'} · last{' '}
                  {formatRelativeTime(item.lastRequestedAt)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onCreate(item.shortName)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-3 h-3" /> Create
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(item.shortName)}
                  aria-label={`Dismiss go/${item.shortName}`}
                  title="Dismiss"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
