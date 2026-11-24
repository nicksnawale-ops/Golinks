import React from 'react';

/**
 * Light placeholder motion for empty charts, in Royal Blue tints so it reads as "waiting for data",
 * never as real figures. Animations live in index.css and stop with reduced motion.
 */

/** Top 10 placeholder: ranked bars that grow in turn and gently breathe. */
export const GhostRankingBars: React.FC = () => {
  const rows = [92, 74, 58, 41, 27];
  return (
    <div className="w-full max-w-sm space-y-2.5 mb-6" aria-hidden="true">
      {rows.map((width, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-14 shrink-0 h-5 rounded-full bg-ve-gray-100 flex items-center px-2">
            <span className="font-mono text-[11px] font-medium text-ve-gray-400">go/</span>
          </span>
          <span className="flex-1 h-3 rounded-full bg-ve-gray-50 overflow-hidden">
            <span
              className="ve-ghost-bar block h-full rounded-full bg-ve-blue-200"
              style={{ width: `${width}%`, animationDelay: `${i * 140}ms` }}
            />
          </span>
        </div>
      ))}
    </div>
  );
};

/** Clicks placeholder: a trend line that draws itself, with a Cyan dot following its tip. */
export const GhostTrendLine: React.FC = () => {
  const d = 'M4 92 C 40 88, 60 70, 96 74 S 150 96, 190 64 S 250 40, 290 52 S 350 30, 396 14';
  return (
    <svg viewBox="0 0 400 104" className="w-full max-w-md h-24 mb-4" aria-hidden="true">
      <path d="M4 100 H396" stroke="#EEF1F6" strokeWidth="1" />
      <path d={`${d} L396 100 L4 100 Z`} className="ve-ghost-area" fill="#F3F7FF" />
      <path
        d={d}
        pathLength={1}
        className="ve-ghost-line"
        fill="none"
        stroke="#A5C1FF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle r="4" fill="#00C6FF" className="ve-ghost-dot" style={{ offsetPath: `path('${d}')` }} />
    </svg>
  );
};
