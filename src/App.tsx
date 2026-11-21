import React, { useEffect, useState } from 'react';
import { CsvImportModal } from './components/CsvImportModal';
import { ActivePage, Navbar, SIDEBAR_OFFSET_CLASS } from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { LoginPage } from './pages/LoginPage';
import { MyLinksPage } from './pages/MyLinksPage';
import { RedirectPage } from './pages/RedirectPage';
import { UsersPage } from './pages/UsersPage';

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

    if (route === 'users') {
      setCurrentPage('users');
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
    } else if (page === 'users') {
      window.location.hash = '#/users';
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

  return (
    <div className="min-h-screen flex flex-col bg-ve-gray-50 text-ve-gray-700">
      <Navbar
        currentPage={currentPage}
        onNavigate={navigateTo}
        onResolve={handleResolvePath}
        onOpenCsvImport={() => setIsCsvModalOpen(true)}
      />

      <main className={`flex-1 pb-12 ${SIDEBAR_OFFSET_CLASS}`}>
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

        {currentPage === 'users' && <UsersPage />}

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

    </div>
  );
}

/** Everything except the sign-in screen needs a session; links reload when the user changes. */
function AuthGate() {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ve-gray-50">
        <div className="w-6 h-6 rounded-full border-2 border-ve-blue border-t-transparent animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (!currentUser) return <LoginPage />;
  return <GoLinksApp key={currentUser.id} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
