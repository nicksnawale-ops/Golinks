import React, { useRef, useState } from 'react';
import { ChevronDown, Shield, UserCheck, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const UserSwitcher: React.FC = () => {
  const { currentUser, availableUsers, switchUser, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (!currentUser) {
    return (
      <div className="flex items-center gap-2">
        <select
          onChange={(e) => switchUser(e.target.value)}
          defaultValue=""
          className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 font-medium text-slate-700"
        >
          <option value="" disabled>
            Select user...
          </option>
          {availableUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-1 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
            isAdmin ? 'bg-indigo-600' : 'bg-blue-600'
          }`}
        >
          {currentUser.name.charAt(0)}
        </div>
        <div className="hidden sm:block text-xs leading-tight">
          <div className="font-semibold text-slate-900 flex items-center gap-1">
            <span>{currentUser.name.split(' ')[0]}</span>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-1 rounded ${
                isAdmin
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {currentUser.role}
            </span>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50">
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              <span
                className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                  isAdmin
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {isAdmin ? 'Admin (Full Management)' : 'Employee (Self Management)'}
              </span>
            </div>
          </div>

          <div className="py-1">
            <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Switch Mock Role / User
            </div>
            {availableUsers.map((u) => {
              const isSelected = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    switchUser(u.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-slate-100 font-semibold text-slate-900'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate">{u.name}</div>
                    <div className="text-[10px] text-slate-400">{u.department}</div>
                  </div>
                  {isSelected && <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-1 mt-1">
            <button
              type="button"
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
