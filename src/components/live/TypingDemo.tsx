import React, { useEffect, useState } from 'react';
import { CornerDownLeft, Globe } from 'lucide-react';
import { usePrefersReducedMotion } from './useReducedMotion';

const EXAMPLES = [
  { path: 'payroll', dest: 'payroll.intranet.local' },
  { path: 'hr', dest: 'hr.intranet.local/portal' },
  { path: 'jira/1234', dest: 'jira.intranet.local/browse/1234' },
  { path: 'wiki/onboarding', dest: 'wiki.intranet.local/onboarding' },
];

type Phase = 'typing' | 'enter' | 'result';

/**
 * The address bar, acted out: go/payroll is typed, Enter is pressed, and the page it opens
 * appears; then the next example. Deep Navy surface, Cyan accents. With reduced motion it shows
 * the first example, finished and still.
 */
export const TypingDemo: React.FC = () => {
  const still = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(still ? EXAMPLES[0].path.length : 0);
  const [phase, setPhase] = useState<Phase>(still ? 'result' : 'typing');
  const example = EXAMPLES[index];

  useEffect(() => {
    if (still) {
      setIndex(0);
      setTyped(EXAMPLES[0].path.length);
      setPhase('result');
      return;
    }
    let t: number;
    if (phase === 'typing') {
      t = typed < example.path.length
        ? window.setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 600 : 95)
        : window.setTimeout(() => setPhase('enter'), 450);
    } else if (phase === 'enter') {
      t = window.setTimeout(() => setPhase('result'), 320);
    } else {
      t = window.setTimeout(() => {
        setIndex((i) => (i + 1) % EXAMPLES.length);
        setTyped(0);
        setPhase('typing');
      }, 2200);
    }
    return () => window.clearTimeout(t);
  }, [still, phase, typed, example.path.length]);

  return (
    <div className="p-4 bg-ve-navy text-white rounded-xl font-mono text-sm">
      <p className="sr-only">Example: type go/payroll in the address bar and press Enter to open the payroll site.</p>
      <div className="flex items-center justify-between gap-3" aria-hidden="true">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-4 h-4 text-ve-cyan shrink-0" />
          <span className="text-ve-cyan font-semibold truncate">
            go/{example.path.slice(0, typed)}
          </span>
          {phase === 'typing' && <span className="ve-caret -ml-1.5 w-px h-4 bg-ve-cyan" />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-ve-gray-300 font-sans">Press</span>
          <kbd
            className={`px-2 py-0.5 border rounded-sm text-xs transition-all duration-150 ${
              phase === 'enter'
                ? 'bg-ve-cyan text-ve-navy border-ve-cyan translate-y-px'
                : 'bg-white/10 border-white/20'
            }`}
          >
            Enter
          </kbd>
        </div>
      </div>
      <div className="mt-3 h-5 flex items-center gap-2 text-xs" aria-hidden="true">
        {phase === 'result' && (
          <span key={index} className="ve-result-in inline-flex items-center gap-2 min-w-0 text-ve-gray-300">
            <CornerDownLeft className="w-3.5 h-3.5 text-ve-cyan shrink-0 -scale-x-100" />
            <span className="font-sans">Opens</span>
            <span className="text-white truncate">https://{example.dest}</span>
          </span>
        )}
      </div>
    </div>
  );
};
