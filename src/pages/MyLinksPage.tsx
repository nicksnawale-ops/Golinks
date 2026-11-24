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
import { AnimatedNumber } from '../components/live/AnimatedNumber';
import { LiveIndicator } from '../components/live/LiveIndicator';
import { useLiveRefresh } from '../components/live/useLiveRefresh';
import { useNewItems } from '../components/live/useNewItems';
import { useAuth } from '../context/AuthContext';
import { GoLink } from '../types/link';
import { formatRelativeTime } from '../utils/formatters';
import { getLinkHealth } from '../utils/linkHealth';

interface MyLinksPageProps {
  links: GoLink[];
  onNavigate: (page: string, params?: any) => void;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentState: boolean) => Promise<GoLink>;
  onResolve: (path: string) => void;
  /** Background re-fetch; when given, the page updates itself while open. */
  onRefresh?: () => Promise<void>;
}

export const MyLinksPage: React.FC<MyLinksPageProps> = ({
  links,
  onNavigate,
  onDelete,
  onToggleActive,
  onResolve,
  onRefresh,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const live = useLiveRefresh(onRefresh);
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

  const newIds = useNewItems(myLinks, (l) => l.id, (l) => l.createdAt);
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ve-gray-500 hover:text-ve-gray-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Shortcuts</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-ve-blue-50 text-ve-blue rounded-lg">
              <User className="w-5 h-5" />
            </span>
            <h1 className="text-ve-gray-900 text-3xl font-semibold">
              My Created GoLinks
            </h1>
          </div>
          {onRefresh && (
            <div className="mt-2">
              <LiveIndicator lastUpdated={live.lastUpdated} paused={live.paused} what="This page" />
            </div>
          )}
          <p className="text-xs text-ve-gray-500 mt-1">
            Shortcuts registered and managed by <strong className="text-ve-gray-800">{currentUser?.email}</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('create')}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-ve-blue hover:bg-ve-navy rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Link</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-ve-gray-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-ve-gray-500">My Shortcuts</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-ve-gray-900">
            <AnimatedNumber value={myLinks.length} showIncrease />
          </div>
          <p className="text-[11px] text-ve-gray-400 mt-0.5">Active ownership</p>
        </div>

        <div className="bg-white border border-ve-gray-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-ve-gray-500">Cumulative Clicks</div>
          <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-ve-gray-900">
            <AnimatedNumber value={totalClicks} showIncrease />
          </div>
          <p className="text-[11px] text-ve-gray-400 mt-0.5">LAN employee visits</p>
        </div>

        <div className="bg-white border border-ve-gray-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs font-medium text-ve-gray-500">Health Indicator</div>
          <div className="mt-1 text-2xl font-bold font-mono text-ve-gray-900 flex items-center gap-2">
            <span>{staleCount}</span>
            <span className="text-xs font-sans font-medium text-ve-gray-700 bg-ve-gray-100 px-2 py-0.5 rounded-full border border-transparent">
              {staleCount === 1 ? '1 Stale Link' : `${staleCount} Stale Links`}
            </span>
          </div>
          <p className="text-[11px] text-ve-gray-400 mt-0.5">90+ days without access</p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ve-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your links..."
            className="w-full pl-9 pr-3 h-10 text-sm bg-white border border-ve-gray-400 rounded-lg placeholder:text-ve-gray-400 focus:outline-hidden focus:border-ve-blue"
          />
        </div>
        <div className="text-xs text-ve-gray-500 font-medium">
          Showing {filteredLinks.length} of {myLinks.length}
        </div>
      </div>

      {/* My Links Table */}
      {myLinks.length === 0 ? (
        <div className="bg-white border border-ve-gray-200 rounded-xl p-12 text-center max-w-md mx-auto">
          <User className="w-10 h-10 text-ve-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-ve-gray-900">You haven't created any GoLinks yet</h3>
          <p className="text-xs text-ve-gray-500 mt-1">
            Create your first short link for your team tools, wikis, or spreadsheets.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => onNavigate('create')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-ve-blue hover:bg-ve-navy rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First GoLink</span>
            </button>
          </div>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="bg-white border border-ve-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-ve-gray-600">No shortcuts matched "{search}".</p>
        </div>
      ) : (
        <div className="bg-white border border-ve-gray-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-ve-gray-50/75 border-b border-ve-gray-200 text-ve-gray-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Short Link</th>
                  <th className="py-3 px-4">Destination & Description</th>
                  <th className="py-3 px-4">Health Status</th>
                  <th className="py-3 px-4 text-right">Clicks</th>
                  <th className="py-3 px-4 text-right">Last Accessed</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ve-gray-100">
                {filteredLinks.map((link) => {
                  const health = getLinkHealth(link);

                  return (
                    <tr
                      key={link.id}
                      onClick={() => onNavigate('details', { id: link.id })}
                      className={`hover:bg-ve-gray-50/80 transition-colors cursor-pointer group ${newIds.has(link.id) ? 've-row-new' : ''}`}
                    >
                      <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onResolve(link.shortName);
                            }}
                            className="font-mono font-bold text-ve-blue hover:text-ve-navy hover:underline flex items-center gap-1"
                          >
                            <span>go/{link.shortName}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          {!link.isActive && (
                            <span className="text-[11px] font-semibold text-ve-navy bg-ve-navy-50 px-1.5 py-0.2 rounded border border-ve-navy-200">
                              Disabled
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <div className="font-medium text-ve-gray-900 truncate">
                          {link.description || 'No description'}
                        </div>
                        <div className="text-xs text-ve-gray-500 font-mono truncate">
                          {link.targetUrl}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {health.status === 'stale' ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-ve-navy bg-ve-navy-50 px-2 py-0.5 rounded border border-ve-navy-200 font-medium"
                            title={`Not accessed in ${health.daysSinceAccess} days`}
                          >
                            <AlertTriangle className="w-3 h-3 text-ve-navy" />
                            <span>Stale (90d+)</span>
                          </span>
                        ) : health.status === 'disabled' ? (
                          <span className="text-xs text-ve-gray-500">Paused</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-ve-navy font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-ve-cyan" />
                            <span>Healthy</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-ve-gray-900 whitespace-nowrap">
                        <AnimatedNumber value={link.clickCount} countUpOnMount={false} showIncrease />
                      </td>

                      <td className="py-3.5 px-4 text-right text-xs text-ve-gray-500 whitespace-nowrap">
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
                            className="p-1.5 text-ve-gray-400 hover:text-ve-gray-700 hover:bg-ve-gray-100 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeactivateModalLink(link)}
                            title={link.isActive ? 'Deactivate link' : 'Reactivate link'}
                            className={`p-1.5 rounded transition-colors ${
                              link.isActive
                                ? 'text-ve-gray-400 hover:text-ve-navy hover:bg-ve-gray-100'
                                : 'text-ve-navy hover:bg-ve-gray-100'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModalLink(link)}
                            title="Delete shortcut"
                            className="p-1.5 text-ve-gray-400 hover:text-ve-navy hover:bg-ve-gray-100 rounded transition-colors"
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
