import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Bookmark,
  HelpCircle,
  History,
  LayoutDashboard,
  Menu,
  Network,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

interface NavItem {
  page: ActivePage;
  title: string;
  icon: React.FC<{ className?: string }>;
  adminOnly?: boolean;
  /** Pages that highlight this item too (e.g. link details under Directory). */
  also?: ActivePage[];
}

const NAV_GROUPS: Array<{ name: string; items: NavItem[] }> = [
  {
    name: 'Links',
    items: [
      { page: 'dashboard', title: 'Dashboard', icon: LayoutDashboard },
      { page: 'directory', title: 'Directory', icon: BookOpen, also: ['details', 'edit', 'redirect'] },
      { page: 'my-links', title: 'My links', icon: Bookmark },
      { page: 'create', title: 'Create link', icon: Plus },
    ],
  },
  {
    name: 'Administration',
    items: [
      { page: 'audit-log', title: 'Audit log', icon: History, adminOnly: true },
      { page: 'users', title: 'Users', icon: Users, adminOnly: true },
    ],
  },
  {
    name: 'Help',
    items: [
      { page: 'help', title: 'How to use', icon: HelpCircle },
      { page: 'setup-guide', title: 'LAN setup guide', icon: Network },
    ],
  },
];

const PAGE_TITLES: Record<ActivePage, string> = {
  dashboard: 'Dashboard',
  directory: 'Directory',
  'my-links': 'My links',
  create: 'Create link',
  edit: 'Edit link',
  details: 'Link details',
  redirect: 'Open link',
  help: 'How to use',
  'setup-guide': 'LAN setup guide',
  'audit-log': 'Audit log',
  users: 'Users',
};

/** Width of the fixed desktop sidebar; App offsets its content by the same amount. */
export const SIDEBAR_OFFSET_CLASS = 'md:pl-[240px]';

/**
 * VisionEdge UDS application shell: a 240px Deep Navy sidebar (slide-over drawer on phones) and a
 * 64px white top bar with the go/ search and the account menu.
 */
export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onResolve }) => {
  const { isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the go/ search from anywhere (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (page: ActivePage) => {
    onNavigate(page);
    setDrawerOpen(false);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = navSearch.trim().replace(/^go\//i, '');
    if (!q) return;
    onResolve(q);
    setNavSearch('');
    searchInputRef.current?.blur();
  };

  const sidebar = (
    <>
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
        <button type="button" onClick={() => go('dashboard')} className="flex items-center gap-3 text-left rounded-lg">
          <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
            <img src="/visionedge-logo.png" alt="" className="w-7 h-7 object-contain" draggable={false} />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold text-white tracking-tight leading-tight">GoLinks</span>
            <span className="text-[11px] text-ve-gray-300 leading-tight">by VisionEdge</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
          className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto ve-sidebar-scroll py-2" aria-label="Main">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => !i.adminOnly || isAdmin);
          if (items.length === 0) return null;
          return (
            <div key={group.name} className="py-2">
              <div className="px-4 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ve-gray-300">
                {group.name}
              </div>
              <div className="space-y-0.5 px-2">
                {items.map((item) => {
                  const active = currentPage === item.page || !!item.also?.includes(currentPage);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.page}
                      type="button"
                      onClick={() => go(item.page)}
                      aria-current={active ? 'page' : undefined}
                      className={`relative w-full h-10 flex items-center gap-3 px-3 rounded-lg text-sm transition-colors group ${
                        active
                          ? 'bg-white/10 text-white font-semibold'
                          : 'text-white/80 font-medium hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-ve-cyan rounded-r" />}
                      <Icon
                        className={`w-5 h-5 shrink-0 ${active ? 'text-ve-cyan' : 'text-white/70 group-hover:text-white'}`}
                      />
                      <span className="truncate">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-white/10 text-[11px] text-ve-gray-300 shrink-0">
        Type <span className="font-mono text-white">go/name</span> in your browser to jump to any link.
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[240px] flex-col bg-ve-navy text-white">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ve-black/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <aside className="relative h-full w-[280px] max-w-[85vw] flex flex-col bg-ve-navy text-white shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Top bar */}
      <header
        className="sticky top-0 z-30 h-16 bg-white border-b border-ve-gray-200 flex items-center gap-3 px-4 sm:px-6 md:ml-[240px]"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="md:hidden p-2 -ml-2 rounded-lg text-ve-gray-600 hover:text-ve-gray-900 hover:bg-ve-gray-50"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-xs text-ve-gray-600 shrink-0">
          <span className="text-ve-gray-500">GoLinks</span>
          <span className="text-ve-gray-300">/</span>
          <span className="font-medium text-ve-gray-900">{PAGE_TITLES[currentPage]}</span>
        </nav>

        <form onSubmit={submitSearch} className="flex-1 min-w-0 flex justify-center lg:justify-end" role="search">
          <label className="relative w-full max-w-md flex items-center">
            <span className="sr-only">Open a go link</span>
            <Search className="absolute left-3 w-4 h-4 text-ve-gray-400 pointer-events-none" />
            <span className="absolute left-9 font-mono text-[13px] font-medium text-ve-blue pointer-events-none">go/</span>
            <input
              ref={searchInputRef}
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Open a link"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full h-9 pl-[62px] pr-10 rounded-lg border border-ve-gray-400 bg-white font-mono text-[13px] text-ve-gray-900 placeholder:font-sans placeholder:text-ve-gray-500 transition-shadow hover:border-ve-blue focus:border-ve-blue focus:shadow-[0_0_0_2px_rgba(30,99,255,0.15)]"
            />
            <kbd className="hidden md:flex absolute right-2 items-center px-1.5 h-5 rounded-sm border border-ve-gray-200 bg-ve-gray-50 font-mono text-[11px] text-ve-gray-500 pointer-events-none">
              /
            </kbd>
          </label>
        </form>

        <button
          type="button"
          onClick={() => onNavigate('create')}
          className="hidden sm:inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-ve-blue hover:bg-ve-navy text-white text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create link
        </button>

        <UserMenu />
      </header>
    </>
  );
};
