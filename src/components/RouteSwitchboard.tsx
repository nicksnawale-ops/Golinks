import React, { useEffect, useMemo, useState } from 'react';

/**
 * Sign-in page backdrop: a switchboard of go/ names wired to the systems they open.
 * An address bar types a real go link, its trace lights up, and a pulse travels to the
 * destination, which shows the resolved URL. Then the next link. Respects reduced motion.
 */

interface Route {
  name: string;
  host: string;
  url: string;
}

// Source order (left) and destination order (right) differ, so the wires cross like a patch bay.
const ROUTES: Route[] = [
  { name: 'hr', host: 'workday', url: 'workday.company.internal/hr/portal' },
  { name: 'jira/PROJ-142', host: 'jira', url: 'jira.company.local/browse/PROJ-142' },
  { name: 'payroll', host: 'adp', url: 'adp.company.internal/portal/payroll' },
  { name: 'wiki', host: 'confluence', url: 'confluence.company.internal/display/KNOWLEDGE' },
  { name: 'vpn', host: 'globalprotect', url: 'vpn.company.internal/instructions/globalprotect' },
];
const DESTINATION_ORDER = ['confluence', 'workday', 'jira', 'globalprotect', 'adp'];

const VIEW_W = 560;
const VIEW_H = 470;
const SRC_X = 24;
const SRC_W = 150;
const DST_X = 392;
const DST_W = 144;
const PILL_H = 34;
const TOP = 40;
const GAP = 84;

const srcY = (i: number) => TOP + i * GAP;
const dstY = (host: string) => TOP + DESTINATION_ORDER.indexOf(host) * GAP;

function wirePath(i: number, host: string): string {
  const sx = SRC_X + SRC_W;
  const sy = srcY(i) + PILL_H / 2;
  const dx = DST_X;
  const dy = dstY(host) + PILL_H / 2;
  const mid = (sx + dx) / 2;
  return `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${dy}, ${dx} ${dy}`;
}

type Phase = 'typing' | 'routing' | 'arrived';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export const RouteSwitchboard: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState(reduced ? ROUTES[0].name.length : 0);
  const [phase, setPhase] = useState<Phase>(reduced ? 'arrived' : 'typing');
  const [cycle, setCycle] = useState(0);

  const route = ROUTES[active];

  useEffect(() => {
    if (reduced) {
      // Still show different links, just without motion.
      setTyped(ROUTES[active].name.length);
      setPhase('arrived');
      const t = window.setTimeout(() => setActive((a) => (a + 1) % ROUTES.length), 4500);
      return () => window.clearTimeout(t);
    }

    const timers: number[] = [];
    const name = ROUTES[active].name;
    setTyped(0);
    setPhase('typing');
    for (let c = 1; c <= name.length; c++) {
      timers.push(window.setTimeout(() => setTyped(c), 380 + c * 85));
    }
    const typedAt = 380 + name.length * 85;
    timers.push(window.setTimeout(() => setPhase('routing'), typedAt + 260));
    timers.push(window.setTimeout(() => setPhase('arrived'), typedAt + 260 + 900));
    timers.push(
      window.setTimeout(() => {
        setActive((a) => (a + 1) % ROUTES.length);
        setCycle((c) => c + 1);
      }, typedAt + 260 + 900 + 2300)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [active, reduced]);

  const paths = useMemo(() => ROUTES.map((r, i) => wirePath(i, r.host)), []);
  const lit = phase !== 'typing';

  return (
    <div className={`gl-switchboard ${compact ? 'gl-switchboard--compact' : ''}`} aria-hidden="true">
      <div className="gl-grid" />

      {/* Address bar: the type is the headline */}
      <div className="gl-addressbar">
        <span className="gl-addressbar__lock" />
        <span className="gl-addressbar__text">
          <span className="gl-addressbar__go">go/</span>
          {route.name.slice(0, typed)}
          {phase === 'typing' && !reduced && <span className="gl-caret" />}
        </span>
        <span className={`gl-addressbar__status ${phase === 'arrived' ? 'is-on' : ''}`}>302</span>
      </div>
      <div className={`gl-resolved ${phase === 'arrived' ? 'is-on' : ''}`}>
        <span className="gl-resolved__arrow" />
        https://{route.url}
      </div>

      {!compact && (
        <svg className="gl-board" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
          {/* Wires */}
          {paths.map((d, i) => (
            <path key={`wire-${i}`} d={d} className={`gl-wire ${i === active && lit ? 'is-lit' : ''}`} />
          ))}

          {/* Pulse travelling along the active wire */}
          {phase === 'routing' && !reduced && (
            <g key={`pulse-${cycle}`}>
              <circle r="9" className="gl-pulse-halo">
                <animateMotion dur="0.9s" fill="freeze" path={paths[active]} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.2 1" />
              </circle>
              <circle r="4" className="gl-pulse">
                <animateMotion dur="0.9s" fill="freeze" path={paths[active]} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.2 1" />
              </circle>
            </g>
          )}

          {/* Sources: go/ names */}
          {ROUTES.map((r, i) => {
            const on = i === active;
            return (
              <g key={`src-${r.name}`} transform={`translate(${SRC_X} ${srcY(i)})`}>
                <rect width={SRC_W} height={PILL_H} rx={PILL_H / 2} className={`gl-src ${on ? 'is-on' : ''}`} />
                <text x={16} y={PILL_H / 2 + 5} className="gl-src__text">
                  <tspan className="gl-src__go">go/</tspan>
                  {r.name.split('/')[0]}
                </text>
                <circle cx={SRC_W} cy={PILL_H / 2} r={4} className={`gl-jack ${on && lit ? 'is-on' : ''}`} />
              </g>
            );
          })}

          {/* Destinations: systems */}
          {ROUTES.map((r) => {
            const on = r.host === route.host && phase === 'arrived';
            return (
              <g key={`dst-${r.host}`} transform={`translate(${DST_X} ${dstY(r.host)})`}>
                <rect width={DST_W} height={PILL_H} rx={8} className={`gl-dst ${on ? 'is-on' : ''}`} />
                <circle cx={0} cy={PILL_H / 2} r={4} className={`gl-jack ${on ? 'is-arrived' : ''}`} />
                <text x={16} y={PILL_H / 2 + 5} className="gl-dst__text">
                  {r.host}
                </text>
                {on && !reduced && (
                  <rect width={DST_W} height={PILL_H} rx={8} className="gl-ripple" />
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};
