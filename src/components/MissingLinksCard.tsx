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
    <div className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-ve-gray-100">
        <h3 className="text-sm font-semibold text-ve-gray-900 flex items-center gap-2">
          <SearchX className="w-4 h-4 text-ve-navy" />
          <span>Most Requested Missing Links</span>
        </h3>
        <span className="text-[11px] text-ve-gray-400">Admins only</span>
      </div>

      {!items ? (
        <div className="space-y-2 pt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-ve-gray-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="pt-4 text-sm text-ve-gray-500">
          Nobody has typed a go link that doesn't exist yet. When they do, it shows up here.
        </p>
      ) : (
        <ul className="divide-y divide-ve-gray-100">
          {items.map((item) => (
            <li key={item.shortName} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="font-mono text-sm font-semibold text-ve-gray-900 truncate">
                  go/{item.shortName}
                </div>
                <div className="text-[11px] text-ve-gray-500">
                  {formatNumber(item.requestCount)} request{item.requestCount === 1 ? '' : 's'} · last{' '}
                  {formatRelativeTime(item.lastRequestedAt)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onCreate(item.shortName)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-ve-blue hover:bg-ve-navy text-white"
                >
                  <Plus className="w-3 h-3" /> Create
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(item.shortName)}
                  aria-label={`Dismiss go/${item.shortName}`}
                  title="Dismiss"
                  className="p-1 rounded-md text-ve-gray-400 hover:text-ve-gray-700 hover:bg-ve-gray-100"
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
