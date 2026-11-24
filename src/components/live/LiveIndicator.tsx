import React, { useEffect, useState } from 'react';

/** "Live · updated 12s ago" with a Cyan pulse; the pulse is still with reduced motion (via CSS). */
export const LiveIndicator: React.FC<{ lastUpdated: number | null; paused?: boolean }> = ({ lastUpdated, paused }) => {
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  const ago = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000)) : null;
  const label = ago === null ? 'Connecting' : ago < 5 ? 'Updated just now' : ago < 60 ? `Updated ${ago}s ago` : `Updated ${Math.round(ago / 60)} min ago`;

  return (
    <span
      className="inline-flex items-center gap-2 h-7 px-2.5 rounded-full border border-ve-gray-200 bg-white text-xs text-ve-gray-600"
      title="The dashboard refreshes itself every 20 seconds while it's open."
    >
      <span className="relative flex w-2 h-2" aria-hidden="true">
        {!paused && <span className="ve-live-ping absolute inset-0 rounded-full bg-ve-cyan" />}
        <span className={`relative w-2 h-2 rounded-full ${paused ? 'bg-ve-gray-400' : 'bg-ve-cyan'}`} />
      </span>
      <span className="font-medium text-ve-gray-900">{paused ? 'Paused' : 'Live'}</span>
      <span className="text-ve-gray-300" aria-hidden="true">
        |
      </span>
      <span>{label}</span>
    </span>
  );
};
