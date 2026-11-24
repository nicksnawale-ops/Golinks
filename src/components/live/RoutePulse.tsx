import React from 'react';

interface RoutePulseProps {
  /** Short link label, e.g. "go/hr". */
  from: React.ReactNode;
  /** Where it goes, e.g. the target URL. */
  to: React.ReactNode;
  /** "dark" on Deep Navy surfaces (Cyan accents allowed), "light" on white. */
  tone?: 'light' | 'dark';
  /** When false the wire is shown idle, with no pulse (e.g. while a form is still incomplete). */
  active?: boolean;
  className?: string;
}

const pills = {
  dark: {
    from: 'text-ve-cyan bg-white/10 border-white/15 font-semibold',
    to: 'text-white/90 bg-white/10 border-white/15',
    wire: 'border-white/30',
    head: 'border-l-white/50',
    dot: 'bg-ve-cyan shadow-[0_0_0_3px_rgba(0,198,255,0.25)]',
  },
  light: {
    from: 'text-ve-blue bg-ve-blue-50 border-ve-blue-200 font-semibold',
    to: 'text-ve-gray-800 bg-white border-ve-gray-200',
    wire: 'border-ve-blue-300',
    head: 'border-l-ve-blue-300',
    dot: 'bg-ve-blue shadow-[0_0_0_3px_rgba(0,198,255,0.35)]',
  },
};

/**
 * go/name ---•---> destination. A pulse runs along the wire and the destination glows as it
 * arrives: what happens every time someone opens the link. Hidden from screen readers (the pills'
 * text is repeated elsewhere on each page); still with reduced motion.
 */
export const RoutePulse: React.FC<RoutePulseProps> = ({ from, to, tone = 'light', active = true, className = '' }) => {
  const t = pills[tone];
  return (
    <div className={`flex items-center gap-2 min-w-0 font-mono text-[13px] sm:text-sm ${className}`}>
      <span className={`shrink-0 max-w-[45%] truncate px-2.5 py-1 rounded-md border ${t.from}`}>{from}</span>
      <span className={`relative shrink-0 w-12 sm:w-20 h-4 ${active ? '' : 'opacity-50'}`} aria-hidden="true">
        <span className={`absolute left-0 right-1.5 top-1/2 border-t border-dashed ${t.wire}`} />
        <span className={`absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-[6px] ${t.head}`} />
        {active && <span className={`ve-route-dot absolute top-1/2 -mt-1 w-2 h-2 rounded-full ${t.dot}`} />}
      </span>
      <span className={`min-w-0 flex-1 truncate px-2.5 py-1 rounded-md border ${t.to} ${active ? 've-route-arrive' : ''}`}>{to}</span>
    </div>
  );
};
