import React, { useEffect, useState } from 'react';
import { CsvImportModal } from './components/CsvImportModal';
import { ActivePage, Navbar } from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { useGoLinks } from './hooks/useGoLinks';
import { AuditLogPage } from './pages/AuditLogPage';
import { CreateLinkPage } from './pages/CreateLinkPage';
import { DashboardPage } from './pages/DashboardPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { EditLinkPage } from './pages/EditLinkPage';
import { HowToUsePage } from './pages/HowToUsePage';
import { LanSetupGuidePage } from './pages/LanSetupGuidePage';
import { LinkDetailsPage } from './pages/LinkDetailsPage';
import { MyLinksPage } from './pages/MyLinksPage';
import { RedirectPage } from './pages/RedirectPage';

function GoLinksApp() {
  const {
    links,
    categories,
    loading,
    filters,
    setFilterValue,
    create,
    update,
    remove,
    toggleActive,
    resetSeeds,
    bulkImport,
  } = useGoLinks();

  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState<ActivePage>('dashboard');
  const [activeParams, setActiveParams] = useState<any>({});
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Sync hash routing with window location
  const parseCurrentRoute = () => {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    const pathname = window.location.pathname.replace(/^\//, '').trim();

    // Prefer hash routing for iframe / static compatibility, fallback to pathname
    let route = hash || (pathname && pathname !== 'index.html' ? pathname : '');
    if (window.location.search && !route.includes('?')) {
      route += window.location.search;
    }

    if (!route || route === 'dashboard') {
      setCurrentPage('dashboard');
      setActiveParams({});
      return;
    }

    if (route === 'directory') {
      setCurrentPage('directory');
      setActiveParams({});
      return;
    }

    if (route === 'my-links') {
      setCurrentPage('my-links');
      setActiveParams({});
      return;
    }

    if (route === 'audit-log') {
      setCurrentPage('audit-log');
      setActiveParams({});
      return;
    }

    if (route === 'create') {
      setCurrentPage('create');
      setActiveParams({});
      return;
    }

    if (route === 'help' || route === 'how-to-use') {
      setCurrentPage('help');
      setActiveParams({});
      return;
    }

    if (route === 'setup-guide') {
      setCurrentPage('setup-guide');
      setActiveParams({});
      return;
    }

    if (route.startsWith('edit/')) {
      const id = route.replace('edit/', '');
      setCurrentPage('edit');
      setActiveParams({ id });
      return;
    }

    if (route.startsWith('link/') || route.startsWith('details/')) {
      const id = route.replace(/^(link|details)\//, '');
      setCurrentPage('details');
      setActiveParams({ id });
      return;
    }

    if (route.startsWith('go/')) {
      const shortPath = route.replace(/^go\//, '');
      setCurrentPage('redirect');
      setActiveParams({ shortPath });
      return;
    }

    // Default catch: treat as a go/<shortPath> shortcut lookup!
    // Example: #/payroll, #/hr, #/jira/1234
    if (route) {
      setCurrentPage('redirect');
      setActiveParams({ shortPath: route });
      return;
    }

    setCurrentPage('dashboard');
    setActiveParams({});
  };

  useEffect(() => {
    parseCurrentRoute();
    const handleHashChange = () => parseCurrentRoute();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: string, params: any = {}) => {
    setActiveParams(params);
    setCurrentPage(page as ActivePage);

    if (page === 'dashboard') {
      window.location.hash = '#/dashboard';
    } else if (page === 'directory') {
      window.location.hash = '#/directory';
    } else if (page === 'my-links') {
      window.location.hash = '#/my-links';
    } else if (page === 'audit-log') {
      window.location.hash = '#/audit-log';
    } else if (page === 'create') {
      window.location.hash = '#/create';
    } else if (page === 'help') {
      window.location.hash = '#/help';
    } else if (page === 'setup-guide') {
      window.location.hash = '#/setup-guide';
    } else if (page === 'details' && params.id) {
      window.location.hash = `#/details/${params.id}`;
    } else if (page === 'edit' && params.id) {
      window.location.hash = `#/edit/${params.id}`;
    } else if (page === 'redirect' && params.shortPath) {
      window.location.hash = `#/go/${params.shortPath}`;
    }
  };

  const handleResolvePath = (path: string) => {
    const clean = path.replace(/^go\//i, '').trim();
    navigateTo('redirect', { shortPath: clean });
  };

  const handleResetSeeds = async () => {
    try {
      await resetSeeds();
      showToast('Reset seed shortcuts to initial corporate configuration', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reset shortcuts', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-blue-100 transition-colors">
      <Navbar
        currentPage={currentPage}
        onNavigate={navigateTo}
        onResolve={handleResolvePath}
        onOpenCsvImport={() => setIsCsvModalOpen(true)}
      />

      <main className="flex-1">
        {currentPage === 'dashboard' && (
          <DashboardPage
            links={links}
            onNavigate={navigateTo}
            onDelete={remove}
            onToggleActive={toggleActive}
            onResolve={handleResolvePath}
            onOpenCsvImport={() => setIsCsvModalOpen(true)}
          />
        )}

        {currentPage === 'directory' && (
          <DirectoryPage
            links={links}
            categories={categories}
            loading={loading}
            filters={filters}
            onFilterChange={setFilterValue}
            onNavigate={navigateTo}
            onDelete={remove}
            onToggleActive={toggleActive}
            onResetSeeds={handleResetSeeds}
            onResolve={handleResolvePath}
            onBulkImport={bulkImport}
          />
        )}

        {currentPage === 'my-links' && (
          <MyLinksPage
            links={links}
            onNavigate={navigateTo}
            onDelete={remove}
            onToggleActive={toggleActive}
            onResolve={handleResolvePath}
          />
        )}

        {currentPage === 'audit-log' && (
          <AuditLogPage onNavigate={navigateTo} />
        )}

        {currentPage === 'create' && (
          <CreateLinkPage
            initialShortName={activeParams?.initialShortName || ''}
            onCreate={create}
            onNavigate={navigateTo}
          />
        )}

        {currentPage === 'edit' && (
          <EditLinkPage
            id={activeParams?.id}
            onUpdate={update}
            onNavigate={navigateTo}
          />
        )}

        {currentPage === 'details' && (
          <LinkDetailsPage
            id={activeParams?.id}
            onNavigate={navigateTo}
            onDelete={remove}
            onToggleActive={toggleActive}
            onResolve={handleResolvePath}
          />
        )}

        {currentPage === 'redirect' && (
          <RedirectPage
            shortPath={activeParams?.shortPath || ''}
            onNavigate={navigateTo}
            onResolve={handleResolvePath}
          />
        )}

        {currentPage === 'help' && (
          <HowToUsePage
            onNavigate={navigateTo}
            onResolve={handleResolvePath}
          />
        )}

        {currentPage === 'setup-guide' && (
          <LanSetupGuidePage onNavigate={navigateTo} />
        )}
      </main>

      {/* Global CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        existingLinks={links}
        onImportConfirm={async (rows) => {
          const count = await bulkImport(rows);
          showToast(`Successfully imported ${count} shortcuts from CSV!`, 'success');
          return count;
        }}
      />

      {/* Corporate LAN Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 mt-12 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">GoLinks Enterprise</span>
            <span aria-hidden="true">·</span>
            <span>Internal LAN Shortcut Service</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigateTo('directory')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Directory
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigateTo('help')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              How to Use
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => navigateTo('setup-guide')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              LAN DNS Documentation
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleResetSeeds}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Reset Sample Shortcuts
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <GoLinksApp />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
