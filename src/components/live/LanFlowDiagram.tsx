import React from 'react';
import { Globe, Monitor, Network, Server } from 'lucide-react';

const STEPS = [
  { icon: Monitor, title: 'Browser', detail: 'Someone types go/hr' },
  { icon: Network, title: 'Office DNS', detail: '"go" → the GoLinks server' },
  { icon: Server, title: 'GoLinks server', detail: 'Looks up hr, replies with a redirect' },
  { icon: Globe, title: 'HR portal', detail: 'Opens in the same tab' },
];

// Seconds into the 8s loop when the pulse leaves each node (see .ve-flow-* in index.css).
const LEG_START = [0.4, 2.4, 4.4];
const LEG_TRAVEL = 1.12; // 14% of 8s

/**
 * What happens on the network when someone opens go/hr: a pulse hops from the browser to the
 * office DNS, to the GoLinks server, to the destination, and each stop lights up as it arrives.
 * Left to right on wider screens, top to bottom on phones. Still with reduced motion.
 */
export const LanFlowDiagram: React.FC = () => (
  <figure className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs">
    <figcaption className="text-base font-semibold text-ve-gray-900">What happens when someone opens go/hr</figcaption>
    <p className="text-xs text-ve-gray-500 mt-0.5">The whole trip stays on your network and takes a few milliseconds.</p>
    <ol className="mt-5 flex flex-col sm:flex-row sm:items-stretch">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const arrivesAt = i === 0 ? 0 : LEG_START[i - 1] + LEG_TRAVEL;
        return (
          <React.Fragment key={step.title}>
            <li
              className="ve-flow-node flex-1 min-w-0 flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 rounded-lg border border-ve-gray-200 bg-white p-3"
              style={{ '--ve-delay': `${arrivesAt}s` } as React.CSSProperties}
            >
              <span className="w-9 h-9 rounded-lg bg-ve-blue-50 text-ve-blue flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ve-gray-900">{step.title}</span>
                <span className="block text-xs text-ve-gray-600 mt-0.5">{step.detail}</span>
              </span>
            </li>
            {i < STEPS.length - 1 && (
              <li aria-hidden="true" className="relative shrink-0 self-center h-6 w-px my-1 sm:my-0 sm:h-px sm:w-8 sm:mx-1">
                <span className="absolute inset-0 border-l sm:border-l-0 sm:border-t border-dashed border-ve-blue-300" />
                <span
                  className="ve-flow-dot absolute left-1/2 -ml-1 sm:left-0 sm:ml-0 top-0 sm:top-1/2 sm:-mt-1 w-2 h-2 rounded-full bg-ve-blue shadow-[0_0_0_3px_rgba(0,198,255,0.35)] opacity-0"
                  style={{ '--ve-delay': `${LEG_START[i]}s` } as React.CSSProperties}
                />
              </li>
            )}
          </React.Fragment>
        );
      })}
    </ol>
  </figure>
);
