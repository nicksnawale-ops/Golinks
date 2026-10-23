import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CornerDownLeft, Globe, Search, Sparkles } from 'lucide-react';
import { getLinks, normalizeShortName } from '../services/linkService';
import { GoLink } from '../types/link';

interface OmnibarProps {
  onResolve: (path: string) => void;
  className?: string;
  initialValue?: string;
}

export const Omnibar: React.FC<OmnibarProps> = ({ onResolve, className = '', initialValue = '' }) => {
  const [input, setInput] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<GoLink[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
    }
  }, [initialValue]);

  // Update suggestions as user types
  useEffect(() => {
    let isMounted = true;
    const clean = normalizeShortName(input);
    if (!clean) {
      getLinks({ sortBy: 'clicks' }).then((all) => {
        if (isMounted) setSuggestions(all.slice(0, 5));
      });
      return;
    }

    getLinks({ query: clean }).then((matches) => {
      if (isMounted) {
        setSuggestions(matches.slice(0, 5));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [input]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsOpen(false);
    onResolve(input.trim());
  };

  const handleSelectSuggestion = (shortName: string) => {
    setInput(`go/${shortName}`);
    setIsOpen(false);
    onResolve(shortName);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center bg-white border border-slate-300 hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 rounded-lg shadow-xs transition-all"
      >
        <div className="flex items-center pl-3.5 pr-2 pointer-events-none text-slate-400">
          <Globe className="w-4 h-4 text-blue-600" />
        </div>

        <div className="flex items-center text-slate-400 font-mono text-sm select-none pl-0.5">
          <span className="text-blue-600 font-semibold">go/</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={input.replace(/^go\//i, '')}
          onChange={(e) => {
            setInput(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="type link or try jira/1234, payroll, hr..."
          className="w-full py-2.5 px-1 font-mono text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-hidden bg-transparent"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="flex items-center gap-1.5 pr-2 shrink-0">
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded">
            <CornerDownLeft className="w-2.5 h-2.5" />
            <span>Enter</span>
          </kbd>
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-md transition-colors"
          >
            <span>Go</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Omnibar suggestions dropdown */}
      {isOpen && (
        <div className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden py-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100">
            <span>{input.trim() ? 'Matching Shortcuts' : 'Popular LAN Shortcuts'}</span>
            <span className="text-slate-400 font-normal">Press Enter to resolve</span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSuggestion(item.shortName)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-sm font-semibold text-blue-600 group-hover:text-blue-700 whitespace-nowrap">
                    go/{item.shortName}
                  </span>
                  <span className="text-xs text-slate-500 truncate">
                    {item.description || item.targetUrl}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400">
                  <span className="text-[11px] text-slate-500">{item.category}</span>
                  <span className="font-mono tabular-nums text-slate-400">{item.clickCount} clicks</span>
                </div>
              </button>
            ))}

            {suggestions.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500 flex items-center justify-between">
                <span>No exact shortcut yet for <strong className="font-mono text-slate-800">go/{normalizeShortName(input)}</strong></span>
                <span className="text-xs text-blue-600 font-medium">Hit Enter to test or create</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
