import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  Plus,
  Power,
  QrCode,
  Search,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { CopyButton } from '../components/CopyButton';
import { DeactivateConfirmModal } from '../components/DeactivateConfirmModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { QuickQRModal } from '../components/QuickQRModal';
import { useAuth } from '../context/AuthContext';
import { GoLink } from '../types/link';
import { formatNumber, formatRelativeTime } from '../utils/formatters';
import { getLinkHealth } from '../utils/linkHealth';

interface MyLinksPageProps {
  links: GoLink[];
  onNavigate: (page: string, params?: any) => void;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentState: boolean) => Promise<GoLink>;
  onResolve: (path: string) => void;
}

export const MyLinksPage: React.FC<MyLinksPageProps> = ({
  links,
  onNavigate,
  onDelete,
  onToggleActive,
  onResolve,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [deleteModalLink, setDeleteModalLink] = useState<GoLink | null>(null);
  const [deactivateModalLink, setDeactivateModalLink] = useState<GoLink | null>(null);
  const [qrModalLink, setQrModalLink] = useState<GoLink | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter links owned by current user
  const userEmail = (currentUser?.email || '').toLowerCase();
  const myLinks = links.filter((link) => link.owner.toLowerCase() === userEmail);

  const filteredLinks = myLinks.filter((link) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim().replace(/^go\//, '');
    return (
      link.shortName.toLowerCase().includes(q) ||
      (link.description || '').toLowerCase().includes(q) ||
      link.targetUrl.toLowerCase().includes(q) ||
      link.category.toLowerCase().includes(q)
    );
  });

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

  const totalClicks = myLinks.reduce((sum, l) => sum + l.clickCount, 0);
  const staleCount = myLinks.filter((l) => getLinkHealth(l).isStale).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('directory')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Shortcuts</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <User className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Created GoLinks
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Shortcuts registered and managed by <strong className="text-slate-800">{currentUser?.email}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('create')}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Link</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">My Shortcuts</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {myLinks.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active ownership</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Cumulative Clicks</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {formatNumber(totalClicks)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">LAN employee visits</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Health Indicator</div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 flex items-center gap-2">
            <span>{staleCount}</span>
            <span className="text-xs font-sans font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {staleCount === 1 ? '1 Stale Link' : `${staleCount} Stale Links`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">90+ days without access</p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your links..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredLinks.length} of {myLinks.length}
        </div>
      </div>

      {/* My Links Table */}
      {myLinks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">You haven't created any GoLinks yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create your first short link for your team tools, wikis, or spreadsheets.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => onNavigate('create')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First GoLink</span>
            </button>
          </div>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-600">No shortcuts matched "{search}".</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Short Link</th>
                  <th className="py-3 px-4">Destination & Description</th>
                  <th className="py-3 px-4">Health Status</th>
                  <th className="py-3 px-4 text-right">Clicks</th>
                  <th className="py-3 px-4 text-right">Last Accessed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLinks.map((link) => {
                  const health = getLinkHealth(link);

                  return (
                    <tr
                      key={link.id}
                      onClick={() => onNavigate('details', { id: link.id })}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onResolve(link.shortName);
                            }}
                            className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                          >
                            <span>go/{link.shortName}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          {!link.isActive && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Disabled
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <div className="font-medium text-slate-900 truncate">
                          {link.description || 'No description'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate">
                          {link.targetUrl}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {health.status === 'stale' ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium"
                            title={`Not accessed in ${health.daysSinceAccess} days`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Stale (90d+)</span>
                          </span>
                        ) : health.status === 'disabled' ? (
                          <span className="text-xs text-slate-500">Paused</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Healthy</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {formatNumber(link.clickCount)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-xs text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(link.lastAccessedAt)}
                      </td>

                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <CopyButton text={`go/${link.shortName}`} showIconOnly size="sm" />
                          <button
                            type="button"
                            onClick={() => onNavigate('edit', { id: link.id })}
                            title="Edit shortcut"
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
                            title="Delete shortcut"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    </div>
  );
};
