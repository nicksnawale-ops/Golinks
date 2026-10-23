import React from 'react';
import { ArrowLeft, BookOpen, Check, Copy, Cpu, Globe, Server, Terminal } from 'lucide-react';
import { CopyButton } from '../components/CopyButton';

interface LanSetupGuidePageProps {
  onNavigate: (page: string) => void;
}

export const LanSetupGuidePage: React.FC<LanSetupGuidePageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => onNavigate('directory')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </button>
      </div>

      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Network Architecture & Setup
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
          How GoLinks Works on Company LAN
        </h1>
        <p className="text-sm text-slate-600 mt-2">
          Internal shortcut services operate through LAN DNS resolution or browser keyword triggers.
          Here is how IT engineers and employees configure the environment.
        </p>
      </div>

      {/* Method 1: Browser Omnibox Search Keyword */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Method 1: Browser Keyword Shortcut (Zero IT Permission Required)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Works instantly on Chrome, Edge, Firefox, Brave, and Safari without DNS changes.
            </p>
          </div>
        </div>

        <ol className="list-decimal list-inside space-y-3 text-xs text-slate-700 leading-relaxed pt-2">
          <li>
            Open your browser settings and navigate to{' '}
            <strong className="text-slate-900">Search Engines → Manage search engines and site search</strong>.
          </li>
          <li>
            Under <strong className="text-slate-900">Site search</strong>, click{' '}
            <strong className="text-slate-900">Add</strong>.
          </li>
          <li>
            Set <strong className="text-slate-900">Name</strong> to <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">GoLinks</code>.
          </li>
          <li>
            Set <strong className="text-slate-900">Shortcut / Keyword</strong> to{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono font-bold">go</code>.
          </li>
          <li>
            Set <strong className="text-slate-900">URL with %s in place of query</strong> to:
            <div className="mt-1 flex items-center gap-2">
              <code className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-800 font-mono text-xs flex-1 break-all select-all">
                {window.location.origin}/#/%s
              </code>
              <CopyButton text={`${window.location.origin}/#/%s`} label="Copy URL" size="sm" />
            </div>
          </li>
          <li>
            Now, anytime you type <strong className="font-mono text-blue-700">go payroll</strong> or{' '}
            <strong className="font-mono text-blue-700">go jira/1234</strong> in your browser address bar and hit Enter, you will be instantly redirected!
          </li>
        </ol>
      </section>

      {/* Method 2: Enterprise DNS & DHCP Option 15 */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Method 2: Corporate LAN DNS & Search Domain (Network-Wide)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configured by Network / Systems Administrators for seamless <code className="font-mono">http://go/&lt;name&gt;</code> access.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-700 leading-relaxed pt-2">
          <p>
            1. <strong>Internal DNS Record:</strong> In your enterprise BIND / Route53 / Active Directory DNS server, create an <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">A</code> record for:
          </p>
          <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs overflow-x-auto">
{`# Internal DNS Zone: corp.internal
go.corp.internal.   300   IN   A   10.42.0.100`}
          </pre>

          <p>
            2. <strong>DHCP Option 15 (Domain Name):</strong> Push the search suffix <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">corp.internal</code> via DHCP to all corporate workstations. When an employee types <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">go/hr</code>, the operating system DNS resolver automatically appends the search suffix to query <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">go.corp.internal</code>.
          </p>

          <p>
            3. <strong>Reverse Proxy / HTTP 307 Redirect:</strong> An Nginx or Envoy proxy terminates port 80/443 on <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">10.42.0.100</code> and issues an HTTP 307 temporary redirect to the configured destination URL.
          </p>
        </div>
      </section>

      {/* Developer API & curl usage */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Developer & CLI Integration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Resolve shortcuts in bash scripts, CI/CD pipelines, or terminal workflows.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
            <span># Fast curl resolution with location header extraction</span>
            <CopyButton text={`curl -sI "http://go/jira/1234" | grep -i location`} size="sm" />
          </div>
          <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs overflow-x-auto">
{`$ curl -sI "http://go/jira/1234" | grep -i location
Location: https://jira.company.internal/browse/1234`}
          </pre>
        </div>
      </section>
    </div>
  );
};
