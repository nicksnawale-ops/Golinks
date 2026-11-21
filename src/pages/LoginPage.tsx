import React, { useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { RouteSwitchboard } from '../components/RouteSwitchboard';
import { useAuth } from '../context/AuthContext';
import { usesBrowserBackend } from '../services/apiClient';
import { checkServer, DemoAccount, getDemoAccounts } from '../services/authService';
import { ve } from '../ui/ve';

const inputClass = ve.input;

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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Switchboard: what a go link does, shown live */}
      <aside className="gl-login-art relative overflow-hidden lg:w-[56%] lg:h-screen lg:sticky lg:top-0 px-5 pt-6 pb-7 sm:px-8 lg:px-14 lg:py-10 flex flex-col">
        <div className="relative flex items-center gap-2.5 text-white">
          <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
            <img src="/visionedge-logo.png" alt="" className="w-7 h-7 object-contain" draggable={false} />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold tracking-tight leading-tight">GoLinks</span>
            <span className="text-[11px] text-ve-gray-300 leading-tight">by VisionEdge</span>
          </span>
        </div>

        <div className="relative mt-6 lg:mt-10 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col w-full lg:max-w-[680px]">
          <p className="hidden lg:block text-[32px] leading-10 font-bold text-white max-w-[30rem]">
            Every system your team uses, one short link away.
          </p>
          <p className="hidden lg:block mt-3 mb-6 text-base text-ve-gray-300 max-w-[30rem]">
            Type a short name like go/hr and land on the right page.
          </p>
          <div className="lg:hidden">
            <RouteSwitchboard compact />
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:min-h-0">
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
              className="order-first mb-8 rounded-xl bg-ve-navy p-4 text-sm text-white"
            >
              <p className="font-semibold">Sign-in isn't available at this address</p>
              <p className="mt-1 text-ve-gray-300">
                The GoLinks server isn't answering here, so accounts, including demo accounts, can't sign in. Open
                GoLinks at the address where its server runs.
              </p>
            </div>
          )}
          <h1 className="text-3xl font-semibold text-ve-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-ve-gray-600">
            Use the work email your administrator added.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className={ve.label}>
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
              <label htmlFor="login-password" className={ve.label}>
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
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-lg text-ve-gray-600 hover:text-ve-gray-900"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="text-sm font-medium text-ve-navy bg-ve-navy-50 border-2 border-ve-navy rounded-lg px-4 py-3"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !email || !password}
              className={`w-full ${ve.btnPrimary} h-10`}
            >
              {submitting === 'form' && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting === 'form' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* On phones the demo accounts come first, so they're visible without scrolling. */}
          {demoAccounts.length > 0 && (
            <section className="order-first mb-8 lg:order-none lg:mb-0 lg:mt-8" aria-labelledby="demo-heading">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-ve-gray-200" />
                <h2 id="demo-heading" className="text-sm font-medium text-ve-gray-600">
                  <span className="lg:hidden">Try a demo account</span>
                  <span className="hidden lg:inline">Or try a demo account</span>
                </h2>
                <span className="h-px flex-1 bg-ve-gray-200" />
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
              <p className="mt-3 text-xs text-ve-gray-600">
                {usesBrowserBackend()
                  ? 'This online version runs in your browser. Links you add are saved on this device only.'
                  : 'Demo accounts are for trying GoLinks out. Your administrator turns them off before real use.'}
              </p>
            </section>
          )}

          <p className="mt-8 text-sm text-ve-gray-600">
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
    <li className="rounded-xl border border-ve-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-ve-gray-900">
            {isAdmin ? 'Admin' : 'Employee'}
          </div>
          <div className="text-xs text-ve-gray-600 mt-0.5">
            {isAdmin ? 'Manages all links and users' : 'Manages their own links'}
          </div>
        </div>
        <button
          type="button"
          onClick={onSignIn}
          disabled={busy}
          className={`shrink-0 h-9 px-4 ${isAdmin ? ve.btnPrimary : ve.btnSecondary}`}
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
      <dt className="text-ve-gray-600">{label}</dt>
      <dd className="font-mono font-medium text-ve-gray-900 truncate select-all">{value}</dd>
      <dd>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="p-1.5 rounded-md text-ve-gray-600 hover:text-ve-gray-900 hover:bg-ve-gray-100"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-ve-blue" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </dd>
    </>
  );
};
