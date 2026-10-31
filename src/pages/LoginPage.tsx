import React, { useEffect, useState } from 'react';
import { FlaskConical, Link2, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DemoAccount, getDemoAccounts } from '../services/authService';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  useEffect(() => {
    getDemoAccounts().then(setDemoAccounts);
  }, []);

  const fillDemoAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError((err as Error).message || 'Sign-in failed.');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm mb-4">
            <Link2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sign in to GoLinks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
            Use the account your administrator created for you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4"
        >
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Work email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {demoAccounts.length > 0 && (
          <div className="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              <FlaskConical className="w-3.5 h-3.5" /> Demo accounts
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
              This server is in demo mode. Tap an account to fill in its details.
            </p>
            <div className="mt-3 space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemoAccount(account)}
                  className="w-full text-left rounded-lg border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900 hover:border-amber-400 px-3 py-2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{account.label}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{account.role}</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                    {account.email}
                    <br />
                    {account.password}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
          Forgot your password? Ask a GoLinks administrator to reset it.
        </p>
      </div>
    </div>
  );
};
