import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, Shield, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  createUser,
  listUsers,
  ManagedUser,
  resetUserPassword,
  updateUser,
} from '../services/authService';
import { UserRole } from '../types/auth';
import { formatRelativeTime } from '../utils/formatters';

const inputClass =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

const emptyForm = { name: '', email: '', department: '', role: 'employee' as UserRole, password: '' };

/** Admin-only user management: add people, change roles, reset passwords, deactivate leavers. */
export const UsersPage: React.FC = () => {
  const { currentUser, isAdmin, refreshAuth } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setUsers(await listUsers());
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-sm text-slate-500">
        User management is available to administrators only.
      </div>
    );
  }

  const run = async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      await action();
      showToast(success, 'success');
      await load();
      await refreshAuth(); // keeps the owner list used by the link form up to date
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const submitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createUser({ ...form, email: form.email.trim(), name: form.name.trim() });
      showToast(`Added ${form.email.trim()}. Share the password with them securely.`, 'success');
      setForm(emptyForm);
      setShowForm(false);
      await load();
      await refreshAuth();
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const promptReset = (u: ManagedUser) => {
    const password = window.prompt(`New password for ${u.email} (min 8 characters):`);
    if (!password) return;
    run(u.id, () => resetUserPassword(u.id, password), `Password reset for ${u.email}. They have been signed out.`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Users
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Who can sign in, and who can administer GoLinks. Deactivating someone signs them out immediately; their
            links keep working.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
        >
          <UserPlus className="w-4 h-4" /> Add user
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submitNewUser}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
          <input
            required
            type="email"
            placeholder="Work email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className={inputClass}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className={inputClass}
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
          <input
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="Initial password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={inputClass}
          />
          <div className="sm:col-span-2 lg:col-span-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white"
            >
              {saving ? 'Adding…' : 'Add user'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last sign-in</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const busy = busyId === u.id;
                return (
                  <tr key={u.id} className={u.isActive ? '' : 'opacity-60'}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {u.name}
                        {isSelf && <span className="text-[10px] text-slate-400 font-normal">(you)</span>}
                      </div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                      {u.department && <div className="text-xs text-slate-400">{u.department}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={busy}
                        onChange={(e) =>
                          run(u.id, () => updateUser(u.id, { role: e.target.value as UserRole }), `${u.email} is now ${e.target.value}.`)
                        }
                        className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 text-xs"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {!u.isActive ? (
                        <span className="text-xs font-semibold text-slate-500">Deactivated</span>
                      ) : !u.hasPassword ? (
                        <span className="text-xs font-semibold text-amber-600">No password set</span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          {u.role === 'admin' && <Shield className="w-3 h-3" />} Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {u.lastLoginAt ? formatRelativeTime(u.lastLoginAt) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => promptReset(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <KeyRound className="w-3 h-3" /> {u.hasPassword ? 'Reset password' : 'Set password'}
                        </button>
                        {!isSelf && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (u.isActive && !window.confirm(`Deactivate ${u.email}? They will be signed out.`)) return;
                              run(
                                u.id,
                                () => updateUser(u.id, { isActive: !u.isActive }),
                                u.isActive ? `${u.email} deactivated.` : `${u.email} reactivated.`
                              );
                            }}
                            className={`px-2.5 py-1 text-xs rounded-md border ${
                              u.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
