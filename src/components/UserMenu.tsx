import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, KeyRound, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { changePassword } from '../services/authService';

/** Signed-in user's menu: who you are, change password, sign out. */
export const UserMenu: React.FC = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (!currentUser) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 py-1 px-2.5 rounded-lg border border-ve-gray-200 bg-ve-gray-50 hover:bg-ve-gray-100 text-left transition-colors"
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
            isAdmin ? 'bg-ve-navy' : 'bg-ve-blue'
          }`}
        >
          {currentUser.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-ve-gray-900">
          <span>{currentUser.name.split(' ')[0]}</span>
          <span
            className={`text-[11px] uppercase font-bold tracking-wider px-1 rounded ${
              isAdmin
                ? 'bg-ve-navy-100 text-ve-navy'
                : 'bg-ve-gray-200 text-ve-gray-700'
            }`}
          >
            {currentUser.role}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-ve-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 w-64 bg-white border border-ve-gray-200 rounded-xl shadow-lg p-2 z-50"
        >
          <div className="px-3 py-2 border-b border-ve-gray-100">
            <div className="text-xs font-semibold text-ve-gray-900">{currentUser.name}</div>
            <div className="text-[11px] text-ve-gray-500 truncate">{currentUser.email}</div>
            {currentUser.department && (
              <div className="text-[11px] text-ve-gray-400 truncate">{currentUser.department}</div>
            )}
          </div>
          <div className="pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setPasswordOpen(true);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-ve-gray-700 hover:bg-ve-gray-50 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Change password
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-ve-navy hover:bg-ve-gray-100 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
    </div>
  );
};

const ChangePasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { showToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) return setError('The new passwords do not match.');
    setSaving(true);
    try {
      await changePassword(current, next);
      showToast('Password changed. Other devices have been signed out.', 'success');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-ve-gray-300 bg-white px-3 py-2 text-sm text-ve-gray-900 focus:outline-none focus:ring-2 focus:ring-ve-blue';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ve-black/50 px-4" role="dialog" aria-modal="true">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white border border-ve-gray-200 rounded-2xl shadow-xl p-6 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ve-gray-900">Change password</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-ve-gray-400 hover:text-ve-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="New password (min 8 characters)"
          required
          minLength={8}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
        {error && <p className="text-sm text-ve-navy">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg text-ve-gray-600 hover:bg-ve-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-ve-blue hover:bg-ve-navy disabled:opacity-60 text-white"
          >
            {saving ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
};
