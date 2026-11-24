import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, Shield, UserPlus, Users } from 'lucide-react';
import { LiveIndicator } from '../components/live/LiveIndicator';
import { useLiveRefresh } from '../components/live/useLiveRefresh';
import { useNewItems } from '../components/live/useNewItems';
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
  'w-full rounded-lg border border-ve-gray-300 bg-white px-3 py-2 text-sm text-ve-gray-900 focus:outline-none focus:ring-2 focus:ring-ve-blue';

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

  // Sign-ins and accounts added by other admins show up without reloading.
  const live = useLiveRefresh(isAdmin ? async () => setUsers(await listUsers()) : undefined);
  const newIds = useNewItems<ManagedUser>(users, (u) => u.id, (u) => u.createdAt);

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-sm text-ve-gray-500">
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
          <h1 className="text-ve-gray-900 flex items-center gap-2 text-3xl font-semibold">
            <Users className="w-6 h-6 text-ve-blue" /> Users
          </h1>
          <div className="mt-2">
            <LiveIndicator lastUpdated={live.lastUpdated} paused={live.paused} what="This list" />
          </div>
          <p className="text-sm text-ve-gray-500 mt-2">
            Who can sign in, and who can administer GoLinks. Deactivating someone signs them out immediately; their
            links keep working.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ve-blue hover:bg-ve-navy text-white text-sm font-semibold"
        >
          <UserPlus className="w-4 h-4" /> Add user
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submitNewUser}
          className="bg-white border border-ve-gray-200 rounded-2xl p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
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
              className="px-3 py-2 text-sm rounded-lg text-ve-gray-600 hover:bg-ve-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-ve-blue hover:bg-ve-navy disabled:opacity-60 text-white"
            >
              {saving ? 'Adding…' : 'Add user'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-ve-gray-200 rounded-2xl overflow-x-auto">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-ve-gray-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ve-gray-500 border-b border-ve-gray-200">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last sign-in</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ve-gray-100">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const busy = busyId === u.id;
                return (
                  <tr key={u.id} className={`${u.isActive ? '' : 'opacity-60'} ${newIds.has(u.id) ? 've-row-new' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ve-gray-900 flex items-center gap-1.5">
                        {u.name}
                        {isSelf && <span className="text-[11px] text-ve-gray-400 font-normal">(you)</span>}
                      </div>
                      <div className="text-xs text-ve-gray-500">{u.email}</div>
                      {u.department && <div className="text-xs text-ve-gray-400">{u.department}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={busy}
                        onChange={(e) =>
                          run(u.id, () => updateUser(u.id, { role: e.target.value as UserRole }), `${u.email} is now ${e.target.value}.`)
                        }
                        className="rounded-md border border-ve-gray-400 bg-white px-2 py-1 text-xs"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {!u.isActive ? (
                        <span className="text-xs font-semibold text-ve-gray-500">Deactivated</span>
                      ) : !u.hasPassword ? (
                        <span className="text-xs font-semibold text-ve-navy">No password set</span>
                      ) : (
                        <span className="text-xs font-semibold text-ve-navy flex items-center gap-1">
                          {u.role === 'admin' && <Shield className="w-3 h-3" />} Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ve-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        {u.isActive && signedInRecently(u.lastLoginAt) && (
                          <span className="relative flex w-2 h-2" title="Signed in within the last 15 minutes">
                            <span className="ve-live-ping absolute inset-0 rounded-full bg-ve-cyan" />
                            <span className="relative w-2 h-2 rounded-full bg-ve-cyan" />
                          </span>
                        )}
                        {u.lastLoginAt ? formatRelativeTime(u.lastLoginAt) : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => promptReset(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-ve-gray-300 hover:bg-ve-gray-50"
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
                                ? 'border-ve-navy-200 text-ve-navy hover:bg-ve-gray-100'
                                : 'border-ve-cyan-200 text-ve-navy hover:bg-ve-gray-100'
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

const RECENT_MS = 15 * 60 * 1000;
function signedInRecently(lastLoginAt: string | null): boolean {
  if (!lastLoginAt) return false;
  const t = Date.parse(lastLoginAt);
  return Number.isFinite(t) && Date.now() - t < RECENT_MS;
}
