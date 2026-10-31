import React, { useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { RouteSwitchboard } from '../components/RouteSwitchboard';
import { useAuth } from '../context/AuthContext';
import { usesBrowserBackend } from '../services/apiClient';
import { checkServer, DemoAccount, getDemoAccounts } from '../services/authService';

const inputClass =
  'w-full h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-[15px] text-[#18213A] dark:text-slate-100 placeholder:text-slate-400 transition-colors focus:outline-none focus:border-[#3D6BFF] focus:ring-4 focus:ring-[#3D6BFF]/15';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null); // 'form' or a demo email
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  const [serverDown, setServerDown] = useState(false);

  useEffect(() => {
    checkServer().then((ok) => {
      setServerDown(!ok);
      if (ok) getDemoAccounts().then(setDemoAccounts);
    });
  }, []);

  const signIn = async (who: string, emailValue: string, passwordValue: string) => {
    setError(null);
    setSubmitting(who);
    try {
      await login(emailValue.trim(), passwordValue);
    } catch (err) {
      setError((err as Error).message || 'Sign-in failed. Try again.');
      if (who === 'form') setPassword('');
      setSubmitting(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn('form', email, password);
  };

  const busy = submitting !== null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F6F7FB] dark:bg-slate-950">
      {/* Switchboard: what a go link does, shown live */}
      <aside className="gl-login-art relative overflow-hidden lg:w-[56%] lg:min-h-screen px-5 pt-6 pb-7 sm:px-8 lg:px-14 lg:py-12 flex flex-col">
        <div className="relative flex items-center gap-2.5 text-white">
          <svg viewBox="0 0 32 32" className="w-8 h-8" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="#3D6BFF" />
            <path d="M9 21c0-3 2-5 5-5h9" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M19.5 12.5 23 16l-3.5 3.5" stroke="#4FD1E6" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-['Plus_Jakarta_Sans'] text-lg font-bold tracking-tight">GoLinks</span>
        </div>

        <div className="relative mt-6 lg:mt-14 lg:flex-1 lg:flex lg:flex-col w-full lg:max-w-[680px]">
          <p className="hidden lg:block font-['Plus_Jakarta_Sans'] text-[1.05rem] leading-relaxed text-[#C9D3FF] max-w-[30rem] mb-8">
            Type a short name, land on the right page. Every system your team uses, one memorable link away.
          </p>
          <div className="lg:hidden">
            <RouteSwitchboard compact />
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:min-h-[480px]">
            <RouteSwitchboard />
          </div>
        </div>
      </aside>

      {/* Sign-in */}
      <main className="flex-1 flex items-start lg:items-center justify-center px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="gl-login-card w-full max-w-[400px] flex flex-col">
          {serverDown && (
            <div
              role="status"
              className="order-first mb-8 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200"
            >
              <p className="font-semibold">Sign-in isn't available at this address</p>
              <p className="mt-1 text-amber-800 dark:text-amber-300">
                The GoLinks server isn't answering here, so accounts, including demo accounts, can't sign in. Open
                GoLinks at the address where its server runs.
              </p>
            </div>
          )}
          <h1 className="font-['Plus_Jakarta_Sans'] text-[1.75rem] leading-tight font-bold tracking-tight text-[#18213A] dark:text-white">
            Sign in
          </h1>
          <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">
            Use the work email your administrator added.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[#18213A] dark:text-slate-200 mb-2">
                Work email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                // Desktop only: on phones, focusing would scroll past the demo accounts and open the keyboard.
                autoFocus={typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[#18213A] dark:text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-[#3D6BFF]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !email || !password}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#3D6BFF] hover:bg-[#2F5AEB] active:bg-[#2A50D4] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-semibold shadow-[0_10px_30px_-12px_rgba(61,107,255,0.7)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D6BFF]"
            >
              {submitting === 'form' && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting === 'form' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* On phones the demo accounts come first, so they're visible without scrolling. */}
          {demoAccounts.length > 0 && (
            <section className="order-first mb-8 lg:order-none lg:mb-0 lg:mt-8" aria-labelledby="demo-heading">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <h2 id="demo-heading" className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  <span className="lg:hidden">Try a demo account</span>
                  <span className="hidden lg:inline">Or try a demo account</span>
                </h2>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <ul className="mt-5 space-y-3">
                {demoAccounts.map((account) => (
                  <DemoAccountRow
                    key={account.email}
                    account={account}
                    busy={busy}
                    signingIn={submitting === account.email}
                    onSignIn={() => signIn(account.email, account.email, account.password)}
                  />
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                {usesBrowserBackend()
                  ? 'This online demo runs in your browser with sample links. Changes stay on this device.'
                  : 'Demo accounts are for trying GoLinks out. Your administrator turns them off before real use.'}
              </p>
            </section>
          )}

          <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
            Forgot your password? Ask a GoLinks administrator to reset it.
          </p>
        </div>
      </main>
    </div>
  );
};

const DemoAccountRow: React.FC<{
  account: DemoAccount;
  busy: boolean;
  signingIn: boolean;
  onSignIn: () => void;
}> = ({ account, busy, signingIn, onSignIn }) => {
  const isAdmin = account.role === 'admin';
  return (
    <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-['Plus_Jakarta_Sans'] font-semibold text-[#18213A] dark:text-white">
            {isAdmin ? 'Admin' : 'Employee'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin ? 'Manages all links and users' : 'Manages their own links'}
          </div>
        </div>
        <button
          type="button"
          onClick={onSignIn}
          disabled={busy}
          className={`shrink-0 h-9 px-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D6BFF] ${
            isAdmin
              ? 'bg-[#18213A] hover:bg-[#232F52] text-white dark:bg-white dark:text-[#18213A] dark:hover:bg-slate-200'
              : 'bg-[#3D6BFF]/10 hover:bg-[#3D6BFF]/20 text-[#2A50D4] dark:text-[#9DB2FF]'
          }`}
        >
          {signingIn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {signingIn ? 'Signing in…' : `Sign in as ${isAdmin ? 'admin' : 'employee'}`}
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5 text-[13px]">
        <CredentialLine label="Email" value={account.email} />
        <CredentialLine label="Password" value={account.password} />
      </dl>
    </li>
  );
};

const CredentialLine: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable on plain-HTTP pages; the value is still selectable.
    }
  };
  return (
    <>
      <dt className="text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="font-['JetBrains_Mono'] text-[#18213A] dark:text-slate-200 truncate select-all">{value}</dd>
      <dd>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </dd>
    </>
  );
};
