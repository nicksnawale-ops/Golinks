import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  Power,
  QrCode,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import { CopyButton } from '../components/CopyButton';
import { CsvImportModal } from '../components/CsvImportModal';
import { DeactivateConfirmModal } from '../components/DeactivateConfirmModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { Omnibar } from '../components/Omnibar';
import { QuickQRModal } from '../components/QuickQRModal';
import { useAuth } from '../context/AuthContext';
import { canUserManageLink } from '../services/authService';
import { downloadCsvFile, exportLinksToCsv } from '../services/csvService';
import { GoLink, SortField, ViewMode } from '../types/link';
import { formatNumber, formatRelativeTime, truncateUrl } from '../utils/formatters';
import { getLinkHealth } from '../utils/linkHealth';

interface DirectoryPageProps {
  links: GoLink[];
  categories: string[];
  loading: boolean;
  filters: {
    query: string;
    category: string;
    visibility: string;
    sortBy: SortField;
    sortOrder: 'asc' | 'desc';
    status: 'all' | 'active' | 'inactive';
  };
  onFilterChange: (key: any, value: any) => void;
  onNavigate: (page: string, params?: any) => void;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentState: boolean) => Promise<GoLink>;
  onResetSeeds: () => Promise<void>;
  onResolve: (path: string) => void;
  onBulkImport: (
    rows: Array<{
      shortName: string;
      targetUrl: string;
      description: string;
      category: string;
    }>
  ) => Promise<number>;
}

export const DirectoryPage: React.FC<DirectoryPageProps> = ({
  links,
  categories,
  loading,
  filters,
  onFilterChange,
  onNavigate,
  onDelete,
  onToggleActive,
  onResetSeeds,
  onResolve,
  onBulkImport,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [deleteModalLink, setDeleteModalLink] = useState<GoLink | null>(null);
  const [deactivateModalLink, setDeactivateModalLink] = useState<GoLink | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qrModalLink, setQrModalLink] = useState<GoLink | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteModalLink) return;
    try {
      setIsProcessing(true);
      await onDelete(deleteModalLink.id);
      setDeleteModalLink(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateModalLink) return;
    try {
      setIsProcessing(true);
      await onToggleActive(deactivateModalLink.id, deactivateModalLink.isActive);
      setDeactivateModalLink(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCsv = () => {
    const csvData = exportLinksToCsv(links);
    downloadCsvFile(csvData, `golinks_directory_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Hero / Omnibox Simulation Banner */}
      <section className="bg-gradient-to-b from-blue-50/60 to-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Internal DNS & Shortcut Resolver
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Navigate your company at the speed of thought.
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            Type memorable short links directly into your browser address bar like{' '}
            <code className="text-xs font-mono font-semibold bg-white px-1.5 py-0.5 border border-slate-200 rounded text-blue-700">
              go/hr
            </code>{' '}
            or{' '}
            <code className="text-xs font-mono font-semibold bg-white px-1.5 py-0.5 border border-slate-200 rounded text-blue-700">
              go/jira/PROJ-123
            </code>
            . Test any link below:
          </p>

          <div className="mt-4">
            <Omnibar onResolve={onResolve} />
          </div>
        </div>
      </section>

      {/* Control Strip: Search, Categories, Status, CSV Tools, View Switch */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => onFilterChange('query', e.target.value)}
              placeholder="Search shortcuts, descriptions, target URLs..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => onFilterChange('query', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-1 py-0.5"
              >
                Clear
              </button>
            )}
          </div>

          {/* Right Controls: CSV Import/Export, Sort & View Mode */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            {/* Export CSV (All users can export or Admin can export) */}
            <button
              type="button"
              onClick={handleExportCsv}
              title="Export all links to CSV"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {/* Admin Bulk CSV Import */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(true)}
                title="Bulk import shortcuts from CSV"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bulk Import</span>
              </button>
            )}

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Sort:</span>
              <select
                value={filters.sortBy}
                onChange={(e) => onFilterChange('sortBy', e.target.value)}
                className="bg-transparent font-medium text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="clicks">Most Clicks</option>
                <option value="recent">Recently Created</option>
                <option value="lastAccessed">Recently Accessed</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table view"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Card view"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            {categories.map((cat) => {
              const isActive = filters.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onFilterChange('category', cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Visibility and Status Sub-filter */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 shrink-0">
            <label className="flex items-center gap-1 cursor-pointer">
              <span>Status:</span>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
                className="bg-transparent font-medium text-slate-800 border-none focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </label>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              type="button"
              onClick={onResetSeeds}
              title="Reset to sample links"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Samples</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main List Section */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600 mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading GoLinks directory...</p>
        </div>
      ) : links.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">No GoLinks found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {filters.query
              ? `No shortcuts matched "${filters.query}". Would you like to create it?`
              : 'There are currently no links matching the selected filters.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {filters.query ? (
              <button
                type="button"
                onClick={() => onNavigate('create', { initialShortName: filters.query })}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create go/{filters.query.toLowerCase().trim().replace(/^go\//, '')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onResetSeeds}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Sample Links</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Short Link</th>
                  <th className="py-3 px-4">Description & Target</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Health Status</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4 text-right">Clicks</th>
                  <th className="py-3 px-4 text-right">Last Accessed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {links.map((link) => {
                  const health = getLinkHealth(link);
                  const canManage = canUserManageLink(currentUser, link);

                  return (
                    <tr
                      key={link.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => onNavigate('details', { id: link.id })}
                    >
                      {/* Short Link */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onResolve(link.shortName);
                            }}
                            className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            title="Open shortcut"
                          >
                            <span>go/{link.shortName}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          {!link.isActive && (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Disabled
                            </span>
                          )}
                          {link.visibility === 'private' && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Private
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Description & Target */}
                      <td className="py-3.5 px-4 align-middle max-w-xs sm:max-w-md">
                        <div className="truncate font-medium text-slate-900">
                          {link.description || 'No description provided'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate hover:text-slate-700 mt-0.5">
                          {link.targetUrl}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap text-xs text-slate-600 font-medium">
                        {link.category}
                      </td>

                      {/* Link Health Indicator (Flagging 90+ days stale) */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        {health.status === 'stale' ? (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold"
                            title={`Flagged: Not accessed in ${health.daysSinceAccess} days`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Stale (90d+)</span>
                          </span>
                        ) : health.status === 'disabled' ? (
                          <span className="text-xs text-slate-400">Disabled</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Healthy</span>
                          </span>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap text-xs text-slate-500">
                        {link.owner}
                      </td>

                      {/* Clicks */}
                      <td className="py-3.5 px-4 align-middle text-right font-mono tabular-nums text-slate-900 font-medium whitespace-nowrap">
                        {formatNumber(link.clickCount)}
                      </td>

                      {/* Last Accessed */}
                      <td className="py-3.5 px-4 align-middle text-right text-xs text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(link.lastAccessedAt)}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 align-middle text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <CopyButton text={`go/${link.shortName}`} showIconOnly size="sm" />
                          <button
                            type="button"
                            onClick={() => setQrModalLink(link)}
                            title="Show Mobile QR Code"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit / Deactivate / Delete conditional on permissions */}
                          {canManage ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onNavigate('edit', { id: link.id })}
                                title="Edit Shortcut"
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeactivateModalLink(link)}
                                title={link.isActive ? 'Deactivate link' : 'Reactivate link'}
                                className={`p-1.5 rounded transition-colors ${
                                  link.isActive
                                    ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteModalLink(link)}
                                title="Delete Shortcut"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onNavigate('details', { id: link.id })}
                              title="View Shortcut Details"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="font-mono text-slate-700">{links.length}</strong> enterprise shortcut{links.length === 1 ? '' : 's'}
            </span>
            <span className="font-mono text-slate-400">DNS Root: go.* · LAN Port 80/443</span>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => {
            const health = getLinkHealth(link);
            const canManage = canUserManageLink(currentUser, link);

            return (
              <div
                key={link.id}
                onClick={() => onNavigate('details', { id: link.id })}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-base font-bold text-blue-600 truncate">
                        go/{link.shortName}
                      </span>
                      {!link.isActive && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium">
                          Disabled
                        </span>
                      )}
                      {health.isStale && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Stale</span>
                        </span>
                      )}
                    </div>
                    <CopyButton text={`go/${link.shortName}`} showIconOnly size="sm" />
                  </div>

                  <p className="text-sm font-medium text-slate-800 mt-2 line-clamp-2">
                    {link.description || 'No description provided'}
                  </p>

                  <div className="mt-2 text-xs font-mono text-slate-500 truncate bg-slate-50 p-1.5 rounded border border-slate-100">
                    {link.targetUrl}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-700">{link.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{link.owner.split('@')[0]}</span>
                  </div>
                  <div className="font-mono tabular-nums font-semibold text-slate-800">
                    {formatNumber(link.clickCount)} clicks
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modals */}
      <DeleteConfirmModal
        isOpen={!!deleteModalLink}
        link={deleteModalLink}
        loading={isProcessing}
        onClose={() => setDeleteModalLink(null)}
        onConfirm={handleDeleteConfirm}
      />

      <DeactivateConfirmModal
        isOpen={!!deactivateModalLink}
        link={deactivateModalLink}
        loading={isProcessing}
        onClose={() => setDeactivateModalLink(null)}
        onConfirm={handleDeactivateConfirm}
      />

      <QuickQRModal
        isOpen={!!qrModalLink}
        link={qrModalLink}
        onClose={() => setQrModalLink(null)}
      />

      {/* CSV Bulk Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        existingLinks={links}
        onImportConfirm={onBulkImport}
      />
    </div>
  );
};
