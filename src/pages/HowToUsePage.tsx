import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Compass,
  ExternalLink,
  HelpCircle,
  Info,
  Lightbulb,
  Search,
  Sparkles,
} from 'lucide-react';
import { CopyButton } from '../components/CopyButton';
import { TypingDemo } from '../components/live/TypingDemo';

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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ve-gray-500 hover:text-ve-gray-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </button>
      </div>

      {/* Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-ve-blue">
          Employee Onboarding & Primer
        </span>
        <h1 className="text-ve-gray-900 mt-1 text-3xl font-semibold">
          How to Use GoLinks
        </h1>
        <p className="text-sm text-ve-gray-600 mt-2">
          GoLinks transforms long, messy URLs into fast, intuitive internal shortcuts directly in your browser.
        </p>
      </div>

      {/* Step 1: Typing go/name */}
      <section className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-ve-blue-100 text-ve-blue font-bold flex items-center justify-center shrink-0 text-sm">
            1
          </div>
          <div>
            <h2 className="text-base font-semibold text-ve-gray-900">
              Type <code className="font-mono text-ve-blue">go/name</code> in your browser address bar
            </h2>
            <p className="text-xs text-ve-gray-600 mt-1">
              Anytime you need a company resource, skip searching bookmarks or Slack channels. Simply focus your browser's address bar (Omnibox) and type:
            </p>
          </div>
        </div>

        <TypingDemo />
      </section>

      {/* Step 2: The First Time Crucial Tip (http://go/name) */}
      <section className="bg-gradient-to-r from-ve-blue-50/70 to-ve-navy-50/50 border border-ve-blue-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-ve-blue text-white font-bold flex items-center justify-center shrink-0 text-sm">
            2
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-ve-blue-100 text-ve-navy text-[11px] font-bold uppercase tracking-wider mb-1">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Crucial Browser Pro-Tip</span>
            </div>
            <h2 className="text-base font-semibold text-ve-gray-900">
              The first time, type <code className="font-mono text-ve-navy">http://go/name</code>
            </h2>
            <p className="text-xs text-ve-gray-700 mt-1 leading-relaxed">
              Modern web browsers (like Google Chrome, Microsoft Edge, and Safari) will initially assume that a single word like <code className="font-mono bg-white px-1 py-0.5 rounded border border-ve-gray-300 font-semibold">go/payroll</code> is a Google search query rather than an internal website.
            </p>
          </div>
        </div>

        <div className="bg-white border border-ve-blue-100 rounded-xl p-4 space-y-2">
          <p className="text-xs text-ve-gray-800 font-semibold">
            By typing <code className="font-mono text-ve-blue">http://go/payroll</code> (or including the trailing slash <code className="font-mono text-ve-blue">go/payroll/</code>) just once:
          </p>
          <ul className="list-disc list-inside text-xs text-ve-gray-600 space-y-1">
            <li>Your browser immediately recognizes <code className="font-mono font-medium">go</code> as an internal LAN server address.</li>
            <li>From that point forward, you can simply type <code className="font-mono font-bold text-ve-gray-800">go/payroll</code> directly!</li>
          </ul>

          <div className="mt-2 pt-2 border-t border-ve-gray-100 flex items-center justify-between text-xs">
            <span className="font-mono text-ve-gray-600">http://go/hr</span>
            <CopyButton text="http://go/hr" label="Copy First-Time Link" size="sm" />
          </div>
        </div>
      </section>

      {/* Step 3: Dynamic Links and Parameter Passthrough */}
      <section className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-ve-blue-100 text-ve-blue font-bold flex items-center justify-center shrink-0 text-sm">
            3
          </div>
          <div>
            <h2 className="text-base font-semibold text-ve-gray-900">
              Dynamic Parameters & Suffix Forwarding
            </h2>
            <p className="text-xs text-ve-gray-600 mt-1">
              You don't need to create a separate shortcut for every ticket or profile. GoLinks forwards parameters dynamically:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-3.5 bg-ve-gray-50 border border-ve-gray-200 rounded-lg">
            <div className="text-xs font-semibold text-ve-gray-800">Jira Ticket Lookup:</div>
            <div className="font-mono text-xs text-ve-blue font-bold mt-1">go/jira/PROJ-123</div>
            <div className="text-[11px] text-ve-gray-500 mt-1 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="truncate">https://jira.company.local/browse/PROJ-123</span>
            </div>
          </div>

          <div className="p-3.5 bg-ve-gray-50 border border-ve-gray-200 rounded-lg">
            <div className="text-xs font-semibold text-ve-gray-800">Employee Directory ID:</div>
            <div className="font-mono text-xs text-ve-blue font-bold mt-1">go/emp/1045</div>
            <div className="text-[11px] text-ve-gray-500 mt-1 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="truncate">https://hrms.local/employee?id=1045</span>
            </div>
          </div>
        </div>
      </section>

      {/* Step 4: Quick Browser Keyword Setup */}
      <section className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-ve-blue-100 text-ve-blue font-bold flex items-center justify-center shrink-0 text-sm">
            4
          </div>
          <div>
            <h2 className="text-base font-semibold text-ve-gray-900">
              Bonus: Omnibox Keyword Search
            </h2>
            <p className="text-xs text-ve-gray-600 mt-1">
              In Google Chrome or Edge, add a Custom Search Engine:
            </p>
          </div>
        </div>

        <div className="p-4 bg-ve-gray-50 border border-ve-gray-200 rounded-lg text-xs space-y-2 text-ve-gray-700">
          <p>
            1. Go to <strong className="text-ve-gray-900">chrome://settings/searchEngines</strong>.
          </p>
          <p>
            2. Add Shortcut keyword: <code className="font-mono font-bold bg-white px-1 py-0.5 rounded text-ve-blue">go</code>.
          </p>
          <p>
            3. Target URL pattern: <code className="font-mono bg-white px-1.5 py-0.5 rounded select-all">{window.location.origin}/#/%s</code>.
          </p>
          <p>
            4. Now typing <strong className="font-mono text-ve-blue">go hr</strong> or <strong className="font-mono text-ve-blue">go jira/1234</strong> in the URL bar works universally!
          </p>
        </div>
      </section>

      {/* Navigation Footer */}
      <div className="pt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('directory')}
          className="px-4 py-2 text-xs font-semibold text-ve-gray-700 bg-white border border-ve-gray-300 hover:bg-ve-gray-50 rounded-lg transition-colors"
        >
          Browse Directory
        </button>

        <button
          type="button"
          onClick={() => onNavigate('create')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-ve-blue hover:bg-ve-navy rounded-lg shadow-xs transition-colors"
        >
          <span>Create a Shortcut Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
