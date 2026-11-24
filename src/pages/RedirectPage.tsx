import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Globe,
  Loader2,
  PauseCircle,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { RoutePulse } from '../components/live/RoutePulse';
import { resolveLink } from '../services/linkService';
import { GoLink, ResolveResult } from '../types/link';

interface RedirectPageProps {
  shortPath: string;
  onNavigate: (page: string, params?: any) => void;
  onResolve: (path: string) => void;
}

export const RedirectPage: React.FC<RedirectPageProps> = ({
  shortPath,
  onNavigate,
  onResolve,
}) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [countdown, setCountdown] = useState(2);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsCancelled(false);
    setCountdown(2);

    resolveLink(shortPath).then((res) => {
      if (!isMounted) return;
      setResult(res);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [shortPath]);

  // Countdown timer and redirect execution
  useEffect(() => {
    if (!result || !result.found || isCancelled) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Execute window.location.replace as specified in requirements
      try {
        window.location.replace(result.resolvedUrl);
      } catch (err) {
        console.warn('Redirect intercept, falling back to window.location.assign', err);
        window.location.assign(result.resolvedUrl);
      }
    }
  }, [countdown, result, isCancelled]);

  const handleImmediateRedirect = () => {
    if (result && result.found) {
      try {
        window.location.replace(result.resolvedUrl);
      } catch {
        window.location.assign(result.resolvedUrl);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-ve-blue mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-ve-gray-900">Resolving go/{shortPath}...</h2>
        <p className="text-xs text-ve-gray-500 mt-1">Checking enterprise DNS routing table</p>
      </div>
    );
  }

  // 1. Successful Resolution Screen with Countdown
  if (result && result.found) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white border border-ve-gray-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-ve-blue-50 text-ve-blue flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>

          <h1 className="text-ve-gray-900 text-3xl font-semibold">
            Redirecting to destination...
          </h1>

          <RoutePulse
            className="mt-4 justify-center text-left"
            from={`go/${shortPath}`}
            to={hostOf(result.resolvedUrl)}
            active={!isCancelled}
          />

          <div className="mt-4 p-3 bg-ve-gray-50 border border-ve-gray-200 rounded-lg text-xs font-mono text-ve-gray-700 break-all text-left">
            <div className="text-[11px] text-ve-gray-400 font-sans uppercase font-semibold mb-1">
              Target Destination:
            </div>
            {result.resolvedUrl}
          </div>

          {result.isParameterMatch && (
            <p className="mt-2 text-xs text-ve-gray-500">
              Parameter forwarded from <code className="font-mono text-ve-blue font-medium">/{result.suffix}</code>
            </p>
          )}

          {!isCancelled ? (
            <div className="mt-6 space-y-3">
              <div className="h-1 rounded-full bg-ve-blue-100 overflow-hidden" aria-hidden="true">
                <div
                  className="ve-progress-fill h-full bg-ve-blue rounded-full"
                  style={{ '--ve-progress-ms': '2000ms' } as React.CSSProperties}
                />
              </div>
              <p className="text-xs text-ve-gray-500">
                Forwarding automatically in{' '}
                <strong className="font-mono text-ve-gray-800 text-sm">{countdown}s</strong>...
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleImmediateRedirect}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-ve-blue hover:bg-ve-navy rounded-lg shadow-xs transition-colors"
                >
                  <span>Go Now</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCancelled(true)}
                  className="px-4 py-2 text-xs font-semibold text-ve-gray-600 hover:text-ve-gray-900 bg-white border border-ve-gray-200 hover:bg-ve-gray-50 rounded-lg transition-colors"
                >
                  Cancel Redirect
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-xs text-ve-navy font-medium">Redirect cancelled.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleImmediateRedirect}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-ve-navy bg-ve-blue-50 hover:bg-ve-blue-100 rounded-lg transition-colors"
                >
                  <span>Open Target in Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('directory')}
                  className="px-4 py-2 text-xs font-semibold text-ve-gray-700 bg-white border border-ve-gray-200 hover:bg-ve-gray-50 rounded-lg transition-colors"
                >
                  Return to Directory
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Inactive / Disabled Link
  if (result && !result.found && result.isDisabled) {
    const inactive = result.link;
    const ownerName = result.owner || inactive?.owner || 'Unknown';
    const shortNameDisplay = inactive ? inactive.shortName : result.attempted;

    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white border border-ve-navy-200 rounded-2xl p-8 shadow-xs text-center">
          <div className="w-12 h-12 rounded-full bg-ve-navy-50 text-ve-navy flex items-center justify-center mx-auto mb-4">
            <PauseCircle className="w-6 h-6" />
          </div>

          <h1 className="text-ve-gray-900 text-3xl font-semibold">
            This link has been disabled
          </h1>
          <p className="text-sm text-ve-gray-600 mt-2">
            The shortcut <code className="font-mono font-semibold text-ve-gray-800 bg-ve-gray-100 px-1.5 py-0.5 rounded">go/{shortNameDisplay}</code> has been disabled and is not accepting redirects.
          </p>

          <div className="mt-4 p-3 bg-ve-gray-50 border border-ve-gray-200 rounded-lg text-xs text-ve-gray-700 flex items-center justify-center gap-2">
            <span className="text-ve-gray-400 font-medium">Link Owner:</span>
            <span className="font-semibold text-ve-gray-900">{ownerName}</span>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            {inactive?.id && (
              <button
                type="button"
                onClick={() => onNavigate('details', { id: inactive.id })}
                className="px-4 py-2 text-xs font-semibold text-ve-gray-700 bg-white border border-ve-gray-200 hover:bg-ve-gray-50 rounded-lg transition-colors"
              >
                View Shortcut Details
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('directory')}
              className="px-4 py-2 text-xs font-semibold text-white bg-ve-blue hover:bg-ve-navy rounded-lg transition-colors"
            >
              Return to Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Link Not Found Page with Fuzzy Match Suggestions & "Create now" CTA
  const attempted = result ? result.attempted : shortPath;
  const suggestions = result ? result.suggestions : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-6">
      <div className="bg-white border border-ve-gray-200 rounded-2xl p-8 shadow-xs text-center">
        <div className="w-12 h-12 rounded-full bg-ve-gray-100 text-ve-gray-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-ve-gray-400" />
        </div>

        <h1 className="text-ve-gray-900 text-3xl font-semibold">
          Link not found
        </h1>
        <p className="text-sm text-ve-gray-600 mt-2">
          The shortcut <code className="font-mono font-bold text-ve-blue bg-ve-blue-50 px-2 py-0.5 rounded border border-ve-blue-200">go/{attempted}</code> has not been claimed yet.
        </p>

        {/* Primary CTA: Create go/<name> now */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('create', { initialShortName: attempted })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-ve-blue hover:bg-ve-navy active:bg-ve-navy rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create go/{attempted} now</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('directory')}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-ve-gray-700 bg-white border border-ve-gray-300 hover:bg-ve-gray-50 rounded-lg transition-colors"
          >
            Browse All Shortcuts
          </button>
        </div>
      </div>

      {/* Fuzzy Match Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="bg-white border border-ve-gray-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-ve-blue" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ve-gray-700">
              Did you mean one of these?
            </h2>
          </div>

          <div className="divide-y divide-ve-gray-100">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="py-3 flex items-center justify-between gap-4 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-ve-blue group-hover:text-ve-navy">
                      go/{suggestion.shortName}
                    </span>
                    <span className="text-xs text-ve-gray-500 font-medium">
                      {suggestion.category}
                    </span>
                  </div>
                  <p className="text-xs text-ve-gray-600 truncate mt-0.5">
                    {suggestion.description || suggestion.targetUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onResolve(suggestion.shortName)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-ve-navy bg-ve-blue-50 hover:bg-ve-blue-100 rounded-md transition-colors"
                  >
                    <span>Go</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('details', { id: suggestion.id })}
                    className="px-2.5 py-1.5 text-xs font-medium text-ve-gray-600 hover:text-ve-gray-900 bg-white border border-ve-gray-200 hover:bg-ve-gray-50 rounded-md transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
