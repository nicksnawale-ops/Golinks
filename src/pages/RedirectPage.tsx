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
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900">Resolving go/{shortPath}...</h2>
        <p className="text-xs text-slate-500 mt-1">Checking enterprise DNS routing table</p>
      </div>
    );
  }

  // 1. Successful Resolution Screen with Countdown
  if (result && result.found) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            Redirecting to destination...
          </h1>

          <div className="mt-3 inline-block font-mono text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
            go/{shortPath}
          </div>

          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 break-all text-left">
            <div className="text-[10px] text-slate-400 font-sans uppercase font-semibold mb-1">
              Target Destination:
            </div>
            {result.resolvedUrl}
          </div>

          {result.isParameterMatch && (
            <p className="mt-2 text-xs text-slate-500">
              Parameter forwarded from <code className="font-mono text-blue-600 font-medium">/{result.suffix}</code>
            </p>
          )}

          {!isCancelled ? (
            <div className="mt-6 space-y-3">
              <p className="text-xs text-slate-500">
                Forwarding automatically in{' '}
                <strong className="font-mono text-slate-800 text-sm">{countdown}s</strong>...
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleImmediateRedirect}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                >
                  <span>Go Now</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCancelled(true)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel Redirect
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-xs text-amber-700 font-medium">Redirect cancelled.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleImmediateRedirect}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <span>Open Target in Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('directory')}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
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
        <div className="bg-white border border-amber-200 rounded-2xl p-8 shadow-xs text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <PauseCircle className="w-6 h-6" />
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            This link has been disabled
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            The shortcut <code className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">go/{shortNameDisplay}</code> has been disabled and is not accepting redirects.
          </p>

          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center justify-center gap-2">
            <span className="text-slate-400 font-medium">Link Owner:</span>
            <span className="font-semibold text-slate-900">{ownerName}</span>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            {inactive?.id && (
              <button
                type="button"
                onClick={() => onNavigate('details', { id: inactive.id })}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                View Shortcut Details
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('directory')}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
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
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-slate-400" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Link not found
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          The shortcut <code className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">go/{attempted}</code> has not been claimed yet.
        </p>

        {/* Primary CTA: Create go/<name> now */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('create', { initialShortName: attempted })}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create go/{attempted} now</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('directory')}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Browse All Shortcuts
          </button>
        </div>
      </div>

      {/* Fuzzy Match Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              Did you mean one of these?
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="py-3 flex items-center justify-between gap-4 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-blue-600 group-hover:text-blue-700">
                      go/{suggestion.shortName}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {suggestion.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 truncate mt-0.5">
                    {suggestion.description || suggestion.targetUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onResolve(suggestion.shortName)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    <span>Go</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('details', { id: suggestion.id })}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
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
