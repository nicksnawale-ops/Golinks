import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  BookOpen,
  HelpCircle,
  Menu,
  Moon,
  Plus,
  Search,
  Shield,
  Sun,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserMenu } from './UserMenu';

export type ActivePage =
  | 'dashboard'
  | 'directory'
  | 'my-links'
  | 'create'
  | 'edit'
  | 'details'
  | 'redirect'
  | 'help'
  | 'setup-guide'
  | 'audit-log'
  | 'users';

interface NavbarProps {
  currentPage: ActivePage;
  onNavigate: (page: ActivePage, params?: any) => void;
  onResolve: (path: string) => void;
  networkStatus?: string;
  onOpenCsvImport?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onResolve,
}) => {
  const { isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [navSearch, setNavSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: "/" focuses the search bar anywhere on the page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in an input, textarea or contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = navSearch.trim();
    if (!query) return;

    // Navigate directly to the shortcut resolution
    onResolve(query);
    setNavSearch('');
    searchInputRef.current?.blur();
    setMobileMenuOpen(false);
  };

  const navItemClass = (page: ActivePage) =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
      currentPage === page
        ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/80 dark:bg-blue-950/50'
        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Left: Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-hidden shrink-0"
          >
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">
              GoLinks<span className="text-blue-600">.</span>
            </span>
            <span className="hidden lg:inline-block text-[11px] font-medium text-slate-400 dark:text-slate-500 border-l border-slate-200 dark:border-slate-800 pl-2.5">
              Enterprise LAN
            </span>
          </button>

          {/* Center-Left: Prominent Global Omnibox Search */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden sm:flex flex-1 max-w-md items-center relative"
          >
            <div className="relative w-full flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4 text-slate-400" />
                <span className="ml-1.5 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                  go/
                </span>
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Type shortName and press Enter..."
                className="w-full pl-16 pr-14 py-1.5 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg border border-transparent focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden transition-all shadow-2xs"
              />

              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <kbd className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded">
                  /
                </kbd>
              </div>
            </div>
          </form>

          {/* Center-Right: Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className={navItemClass('dashboard')}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => onNavigate('directory')}
              className={navItemClass('directory')}
            >
              Directory
            </button>

            <button
              type="button"
              onClick={() => onNavigate('my-links')}
              className={navItemClass('my-links')}
            >
              My Links
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('audit-log')}
                className={navItemClass('audit-log')}
              >
                Audit Log
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('users')}
                className={navItemClass('users')}
              >
                Users
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('help')}
              className={navItemClass('help')}
            >
              How to Use
            </button>

            <button
              type="button"
              onClick={() => onNavigate('setup-guide')}
              className={navItemClass('setup-guide')}
            >
              LAN DNS
            </button>
          </nav>

          {/* Right Action Cluster: Theme Toggle + User Switcher + CTA */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Account menu */}
            <div className="hidden sm:block">
              <UserMenu />
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={() => onNavigate('create')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Create Link</span>
            </button>

            {/* Mobile menu hamburger toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Global Search bar (visible on xs screens below sm) */}
        <div className="sm:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="relative w-full flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
                <span className="ml-1 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  go/
                </span>
              </div>
              <input
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Type shortName + Enter..."
                className="w-full pl-14 pr-4 py-2 text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-lg border border-transparent focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-2 shadow-lg">
          <div className="sm:hidden pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <UserMenu />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onNavigate('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`text-left ${navItemClass('dashboard')}`}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate('directory');
                setMobileMenuOpen(false);
              }}
              className={`text-left ${navItemClass('directory')}`}
            >
              Directory
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate('my-links');
                setMobileMenuOpen(false);
              }}
              className={`text-left ${navItemClass('my-links')}`}
            >
              My Links
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onNavigate('audit-log');
                  setMobileMenuOpen(false);
                }}
                className={`text-left ${navItemClass('audit-log')}`}
              >
                Audit Log
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onNavigate('users');
                  setMobileMenuOpen(false);
                }}
                className={`text-left ${navItemClass('users')}`}
              >
                Users
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onNavigate('help');
                setMobileMenuOpen(false);
              }}
              className={`text-left ${navItemClass('help')}`}
            >
              How to Use
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate('setup-guide');
                setMobileMenuOpen(false);
              }}
              className={`text-left ${navItemClass('setup-guide')}`}
            >
              LAN DNS Guide
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
