import React, { useEffect, useState } from 'react';

/**
 * Sidebar backdrop: faint line art of what GoLinks does. A go/ link sits on the left and is wired
 * to three destinations (a web app, a document, a server). Every few seconds a Cyan pulse travels
 * one route and the destination brightens as it "arrives"; soft wave lines drift behind.
 *
 * Decorative only (aria-hidden, no pointer events). White line work at low opacity and Cyan
 * accents, both allowed on Deep Navy by the VisionEdge UDS. With reduced motion, the art is shown
 * still (no pulses, no drift).
 */

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// Routes from the go/ pill's right edge to each destination's connection point.
const ROUTES = {
  web: 'M92 236 C 112 236, 112 163, 132 163',
  doc: 'M92 236 C 142 236, 162 196, 198 196',
  server: 'M92 236 C 116 236, 128 232, 150 232',
};

/** One cycle covers all three routes in turn. */
const CYCLE = 9; // seconds
const TRAVEL = 1.6; // seconds a pulse takes to cross its route

function Pulse({ path, delay }: { path: string; delay: number }) {
  const travelEnd = (TRAVEL / CYCLE).toFixed(3);
  const fadeEnd = ((TRAVEL + 0.25) / CYCLE).toFixed(3);
  const common = {
    dur: `${CYCLE}s`,
    begin: `${delay}s`,
    repeatCount: 'indefinite' as const,
  };
  return (
    <g opacity={0}>
      <animate attributeName="opacity" values="1;1;0;0" keyTimes={`0;${travelEnd};${fadeEnd};1`} {...common} />
      <circle r="6" fill="#00C6FF" fillOpacity="0.22" />
      <circle r="2.25" fill="#00C6FF" />
      <animateMotion
        path={path}
        keyPoints="0;1;1"
        keyTimes={`0;${travelEnd};1`}
        calcMode="spline"
        keySplines="0.45 0 0.2 1;0 0 1 1"
        {...common}
      />
    </g>
  );
}

/** Brightens a destination for a moment when its pulse arrives. */
function Arrive({ delay }: { delay: number }) {
  const t = (n: number) => (n / CYCLE).toFixed(3);
  return (
    <animate
      attributeName="stroke-opacity"
      values="0.32;0.32;0.95;0.32;0.32"
      keyTimes={`0;${t(TRAVEL - 0.05)};${t(TRAVEL + 0.15)};${t(TRAVEL + 1.4)};1`}
      dur={`${CYCLE}s`}
      begin={`${delay}s`}
      repeatCount="indefinite"
    />
  );
}

export const SidebarRoutesArt: React.FC = () => {
  const still = usePrefersReducedMotion();
  return (
  <div className="ve-sidebar-art pointer-events-none absolute inset-x-0 bottom-0 h-[280px]" aria-hidden="true">
    <svg viewBox="0 0 240 280" className="absolute bottom-0 left-0 w-full h-full" preserveAspectRatio="xMidYMax meet">
      {/* Drifting wave lines */}
      <g fill="none" stroke="#FFFFFF" strokeLinecap="round" className="ve-art-waves">
        <path d="M-20 120 C 30 92, 80 142, 130 116 S 210 84, 260 108" strokeOpacity="0.10" />
        <path d="M-20 138 C 34 112, 86 160, 136 134 S 214 104, 260 126" strokeOpacity="0.08" />
        <path d="M-20 156 C 38 132, 92 178, 142 152 S 218 124, 260 144" strokeOpacity="0.06" />
      </g>

      {/* Routes */}
      <g fill="none" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="3 4" className="ve-art-routes">
        <path d={ROUTES.web} />
        <path d={ROUTES.doc} />
        <path d={ROUTES.server} />
      </g>

      {/* go/ link */}
      <g>
        <rect x="24" y="224" width="68" height="24" rx="12" fill="#FFFFFF" fillOpacity="0.06" stroke="#FFFFFF" strokeOpacity="0.4" />
        <text x="38" y="240.5" fontFamily="'JetBrains Mono', monospace" fontSize="11" fontWeight="500">
          <tspan fill="#00C6FF" fillOpacity="0.9">go/</tspan>
          <tspan fill="#FFFFFF" fillOpacity="0.7">hr</tspan>
        </text>
        <circle cx="92" cy="236" r="2.5" fill="#0B2D6B" stroke="#00C6FF" strokeOpacity="0.8" />
      </g>

      {/* Destination: web app */}
      <g fill="none" stroke="#FFFFFF" strokeOpacity="0.32" strokeWidth="1">
        {!still && <Arrive delay={0} />}
        <rect x="132" y="144" width="58" height="40" rx="4" />
        <path d="M132 153 H190" />
        <circle cx="137.5" cy="148.5" r="1" />
        <circle cx="141.5" cy="148.5" r="1" />
        <circle cx="145.5" cy="148.5" r="1" />
        <path d="M140 163 H170 M140 170 H162 M140 177 H176" />
      </g>

      {/* Destination: document */}
      <g fill="none" stroke="#FFFFFF" strokeOpacity="0.32" strokeWidth="1">
        {!still && <Arrive delay={3} />}
        <path d="M198 178 H218 L226 186 V216 H198 Z" />
        <path d="M218 178 V186 H226" />
        <path d="M204 194 H220 M204 200 H220 M204 206 H214" />
      </g>

      {/* Destination: server */}
      <g fill="none" stroke="#FFFFFF" strokeOpacity="0.32" strokeWidth="1">
        {!still && <Arrive delay={6} />}
        <rect x="150" y="214" width="38" height="12" rx="2" />
        <rect x="150" y="226" width="38" height="12" rx="2" />
        <rect x="150" y="238" width="38" height="12" rx="2" />
        <path d="M156 220 H166 M156 232 H166 M156 244 H166" />
        <circle cx="181" cy="220" r="1" />
        <circle cx="181" cy="232" r="1" />
        <circle cx="181" cy="244" r="1" />
      </g>

      {/* Ground */}
      <path d="M0 266 H240" stroke="#FFFFFF" strokeOpacity="0.14" />
      <path d="M12 272 H70 M96 272 H132 M168 272 H226" stroke="#FFFFFF" strokeOpacity="0.07" strokeDasharray="2 5" />

      {/* Pulses: one route at a time */}
      {!still && (
        <>
          <Pulse path={ROUTES.web} delay={0} />
          <Pulse path={ROUTES.doc} delay={3} />
          <Pulse path={ROUTES.server} delay={6} />
        </>
      )}
    </svg>
  </div>
  );
};
