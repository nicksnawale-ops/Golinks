import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Compass,
  CornerDownLeft,
  ExternalLink,
  Globe,
  HelpCircle,
  Info,
  Lightbulb,
  Search,
  Sparkles,
} from 'lucide-react';
import { CopyButton } from '../components/CopyButton';

interface HowToUsePageProps {
  onNavigate: (page: string) => void;
  onResolve: (path: string) => void;
}

export const HowToUsePage: React.FC<HowToUsePageProps> = ({ onNavigate, onResolve }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => onNavigate('directory')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </button>
      </div>

      {/* Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Employee Onboarding & Primer
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
          How to Use GoLinks
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
          GoLinks transforms long, messy URLs into fast, intuitive internal shortcuts directly in your browser.
        </p>
      </div>

      {/* Step 1: Typing go/name */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-sm">
            1
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Type <code className="font-mono text-blue-600 dark:text-blue-400">go/name</code> in your browser address bar
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Anytime you need a company resource, skip searching bookmarks or Slack channels. Simply focus your browser's address bar (Omnibox) and type:
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-xl font-mono text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 font-bold">go/payroll</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Hit</span>
            <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs">Enter</kbd>
          </div>
        </div>
      </section>

      {/* Step 2: The First Time Crucial Tip (http://go/name) */}
      <section className="bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-slate-900 dark:to-slate-900 border border-blue-200 dark:border-blue-900/40 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
            2
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-1">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Crucial Browser Pro-Tip</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              The first time, type <code className="font-mono text-blue-700 dark:text-blue-400">http://go/name</code>
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
              Modern web browsers (like Google Chrome, Microsoft Edge, and Safari) will initially assume that a single word like <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-semibold">go/payroll</code> is a Google search query rather than an internal website.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 rounded-xl p-4 space-y-2">
          <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
            By typing <code className="font-mono text-blue-600 dark:text-blue-400">http://go/payroll</code> (or including the trailing slash <code className="font-mono text-blue-600 dark:text-blue-400">go/payroll/</code>) just once:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <li>Your browser immediately recognizes <code className="font-mono font-medium">go</code> as an internal LAN server address.</li>
            <li>From that point forward, you can simply type <code className="font-mono font-bold text-slate-800 dark:text-slate-200">go/payroll</code> directly!</li>
          </ul>

          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-600 dark:text-slate-300">http://go/hr</span>
            <CopyButton text="http://go/hr" label="Copy First-Time Link" size="sm" />
          </div>
        </div>
      </section>

      {/* Step 3: Dynamic Links and Parameter Passthrough */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-sm">
            3
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Dynamic Parameters & Suffix Forwarding
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              You don't need to create a separate shortcut for every ticket or profile. GoLinks forwards parameters dynamically:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Jira Ticket Lookup:</div>
            <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">go/jira/PROJ-123</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="truncate">https://jira.company.local/browse/PROJ-123</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Employee Directory ID:</div>
            <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">go/emp/1045</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="truncate">https://hrms.local/employee?id=1045</span>
            </div>
          </div>
        </div>
      </section>

      {/* Step 4: Quick Browser Keyword Setup */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-sm">
            4
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Bonus: Omnibox Keyword Search
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              In Google Chrome or Edge, add a Custom Search Engine:
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-2 text-slate-700 dark:text-slate-300">
          <p>
            1. Go to <strong className="text-slate-900 dark:text-white">chrome://settings/searchEngines</strong>.
          </p>
          <p>
            2. Add Shortcut keyword: <code className="font-mono font-bold bg-white dark:bg-slate-700 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">go</code>.
          </p>
          <p>
            3. Target URL pattern: <code className="font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded select-all">{window.location.origin}/#/%s</code>.
          </p>
          <p>
            4. Now typing <strong className="font-mono text-blue-600 dark:text-blue-400">go hr</strong> or <strong className="font-mono text-blue-600 dark:text-blue-400">go jira/1234</strong> in the URL bar works universally!
          </p>
        </div>
      </section>

      {/* Navigation Footer */}
      <div className="pt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('directory')}
          className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          Browse Directory
        </button>

        <button
          type="button"
          onClick={() => onNavigate('create')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <span>Create a Shortcut Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
