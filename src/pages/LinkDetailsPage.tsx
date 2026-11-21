import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Edit2,
  ExternalLink,
  Globe,
  Lock,
  Play,
  Power,
  QrCode,
  Shield,
  Tag,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { CopyButton } from '../components/CopyButton';
import { DeactivateConfirmModal } from '../components/DeactivateConfirmModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { QuickQRModal } from '../components/QuickQRModal';
import { useAuth } from '../context/AuthContext';
import { canUserManageLink } from '../services/authService';
import { getLink, getLinkDailyClicks, recordClick } from '../services/linkService';
import { ClickTrendChart } from '../components/ClickTrendChart';
import { GoLink } from '../types/link';
import { formatFullDateTime, formatNumber, formatRelativeTime } from '../utils/formatters';
import { getLinkHealth } from '../utils/linkHealth';

interface LinkDetailsPageProps {
  id: string;
  onNavigate: (page: string, params?: any) => void;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentState: boolean) => Promise<GoLink>;
  onResolve: (path: string) => void;
}

export const LinkDetailsPage: React.FC<LinkDetailsPageProps> = ({
  id,
  onNavigate,
  onDelete,
  onToggleActive,
  onResolve,
}) => {
  const { currentUser } = useAuth();
  const [link, setLink] = useState<GoLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Dynamic test parameter simulation
  const [testSuffix, setTestSuffix] = useState('');
  const [testResultUrl, setTestResultUrl] = useState('');

  const fetchLink = async () => {
    try {
      setLoading(true);
      const data = await getLink(id);
      if (!data) {
        setError(`GoLink with ID "${id}" could not be found.`);
      } else {
        setLink(data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLink();
  }, [id]);

  // Compute test parameter URL whenever suffix changes
  useEffect(() => {
    if (!link) return;
    if (!testSuffix.trim()) {
      setTestResultUrl(link.targetUrl.replace(/%s$/, ''));
      return;
    }
    const suffix = testSuffix.trim().replace(/^\/+/, '');
    if (link.targetUrl.includes('%s')) {
      setTestResultUrl(link.targetUrl.replace('%s', encodeURIComponent(suffix)));
    } else if (link.targetUrl.endsWith('/')) {
      setTestResultUrl(link.targetUrl + suffix);
    } else {
      setTestResultUrl(`${link.targetUrl}/${suffix}`);
    }
  }, [testSuffix, link]);

  const handleTestLink = async () => {
    if (!link) return;
    await recordClick(link.id);
    const updated = await getLink(link.id);
    if (updated) setLink(updated);

    // If testSuffix was entered, open testResultUrl, else targetUrl
    const urlToOpen = testSuffix.trim() ? testResultUrl : link.targetUrl.replace(/%s$/, '');
    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmToggleStatus = async () => {
    if (!link) return;
    try {
      setIsToggling(true);
      const updated = await onToggleActive(link.id, link.isActive);
      setLink(updated);
      setIsDeactivateModalOpen(false);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!link) return;
    try {
      setIsDeleting(true);
      await onDelete(link.id);
      setIsDeleteModalOpen(false);
      onNavigate('directory');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-ve-gray-200 border-t-ve-blue mb-3" />
        <p className="text-sm text-ve-gray-500">Loading shortcut details...</p>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-base font-semibold text-ve-gray-900">{error || 'Link not found'}</p>
        <button
          type="button"
          onClick={() => onNavigate('directory')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-ve-blue rounded-lg hover:bg-ve-navy"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  const canManage = canUserManageLink(currentUser, link);
  const health = getLinkHealth(link);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Breadcrumb & Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate('directory')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ve-gray-500 hover:text-ve-gray-800 transition-colors self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <CopyButton text={`go/${link.shortName}`} label="Copy go/link" />
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-ve-gray-50 text-ve-gray-700 border border-ve-gray-200 rounded-md transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-ve-gray-500" />
            <span>QR Code</span>
          </button>

          {/* Edit / Deactivate / Delete gated by RBAC */}
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('edit', { id: link.id })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-ve-gray-50 text-ve-gray-700 border border-ve-gray-200 rounded-md transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-ve-gray-500" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeactivateModalOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  link.isActive
                    ? 'bg-white hover:bg-ve-gray-50 text-ve-gray-900 border-ve-gray-200'
                    : 'bg-white hover:bg-ve-gray-50 text-ve-blue border-ve-blue'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{link.isActive ? 'Deactivate' : 'Activate'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-ve-gray-100 text-ve-navy border border-ve-gray-200 hover:border-ve-navy-200 rounded-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-ve-blue">
                go/{link.shortName}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded border ${
                  link.isActive
                    ? 'bg-ve-cyan-50 text-ve-navy border-ve-cyan-200'
                    : 'bg-ve-navy-50 text-ve-navy border-ve-navy-200'
                }`}
              >
                {link.isActive ? 'Active Shortcut' : 'Disabled'}
              </span>

              {/* Link Health Indicator Badge */}
              {health.status === 'stale' && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full border bg-ve-gray-100 text-ve-gray-700 border-transparent flex items-center gap-1"
                  title={`Flagged as stale: Not accessed in ${health.daysSinceAccess} days`}
                >
                  <AlertTriangle className="w-3 h-3 text-ve-navy" />
                  <span>Stale (90d+ inactive)</span>
                </span>
              )}

              <span className="text-xs text-ve-gray-500 border border-ve-gray-200 px-2 py-0.5 rounded bg-ve-gray-50 flex items-center gap-1">
                {link.visibility === 'public' ? (
                  <>
                    <Users className="w-3 h-3 text-ve-gray-400" />
                    <span>Public to LAN</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-ve-gray-400" />
                    <span>Private</span>
                  </>
                )}
              </span>
            </div>

            <p className="mt-2 text-base text-ve-gray-700 font-medium">
              {link.description || 'No description provided.'}
            </p>
          </div>

          {/* Test Link Primary CTA Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleTestLink}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-ve-blue hover:bg-ve-navy active:bg-ve-navy rounded-lg shadow-xs transition-colors"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Test Link</span>
              <ExternalLink className="w-3.5 h-3.5 text-ve-blue-200" />
            </button>
          </div>
        </div>

        {/* Destination Box */}
        <div className="mt-6 p-4 bg-ve-gray-50 border border-ve-gray-200 rounded-lg space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ve-gray-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-ve-gray-400" />
              <span>Configured Destination</span>
            </span>
            <CopyButton text={link.targetUrl} label="Copy Target" size="sm" />
          </div>
          <div className="font-mono text-sm text-ve-gray-800 break-all bg-white p-2.5 rounded border border-ve-gray-200">
            {link.targetUrl}
          </div>
        </div>

        {/* Dynamic Parameter / Suffix Tester */}
        <div className="mt-4 p-4 border border-ve-blue-100 bg-ve-blue-50/40 rounded-lg">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ve-navy">
              Interactive Path Expansion Tester
            </h4>
            <span className="text-[11px] text-ve-blue font-medium">LAN Omnibar Simulator</span>
          </div>
          <p className="text-xs text-ve-gray-600 mt-1">
            Test how dynamic suffixes (e.g., ticket ID or search terms) forward when employees type{' '}
            <code className="font-mono text-ve-navy">go/{link.shortName}/&lt;parameter&gt;</code>.
          </p>

          <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center bg-white border border-ve-gray-300 rounded-lg px-2.5 py-1.5 text-sm font-mono flex-1 focus-within:border-ve-blue focus-within:ring-1 focus-within:ring-ve-blue">
              <span className="text-ve-blue font-semibold select-none">go/{link.shortName}/</span>
              <input
                type="text"
                value={testSuffix}
                onChange={(e) => setTestSuffix(e.target.value)}
                placeholder="1234 or onboarding/guide"
                className="w-full bg-transparent border-none focus:outline-hidden text-ve-gray-900 px-1 text-sm font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleTestLink}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-ve-navy bg-ve-blue-100 hover:bg-ve-blue-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch Resolved URL</span>
            </button>
          </div>

          <div className="mt-2 text-xs text-ve-gray-600 flex items-center gap-2">
            <span className="font-medium text-ve-gray-500">Resolves to:</span>
            <span className="font-mono text-ve-gray-800 truncate bg-white px-2 py-0.5 rounded border border-ve-gray-200">
              {testResultUrl}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics & Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clicks */}
        <div className="bg-white border border-ve-gray-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium text-ve-gray-500 flex items-center justify-between">
            <span>Total Access Clicks</span>
            <Activity className="w-4 h-4 text-ve-blue" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-ve-gray-900">
            {formatNumber(link.clickCount)}
          </div>
          <p className="text-xs text-ve-gray-500 mt-1">Direct LAN redirects logged</p>
        </div>

        {/* Last Accessed */}
        <div className="bg-white border border-ve-gray-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium text-ve-gray-500 flex items-center justify-between">
            <span>Last Accessed</span>
            <Clock className="w-4 h-4 text-ve-navy" />
          </div>
          <div className="mt-2 text-lg font-semibold text-ve-gray-900">
            {formatRelativeTime(link.lastAccessedAt)}
          </div>
          <p className="text-xs text-ve-gray-500 mt-1 truncate">
            {link.lastAccessedAt ? formatFullDateTime(link.lastAccessedAt) : 'No recorded visits yet'}
          </p>
        </div>

        {/* Created Date */}
        <div className="bg-white border border-ve-gray-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium text-ve-gray-500 flex items-center justify-between">
            <span>Created Date</span>
            <Calendar className="w-4 h-4 text-ve-gray-500" />
          </div>
          <div className="mt-2 text-lg font-semibold text-ve-gray-900">
            {new Date(link.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <p className="text-xs text-ve-gray-500 mt-1">Initial registration</p>
        </div>

        {/* Owner & Department */}
        <div className="bg-white border border-ve-gray-200 rounded-xl p-5 shadow-xs">
          <div className="text-xs font-medium text-ve-gray-500 flex items-center justify-between">
            <span>Owner & Dept</span>
            <User className="w-4 h-4 text-ve-navy" />
          </div>
          <div className="mt-2 text-sm font-semibold text-ve-gray-900 truncate">
            {link.owner}
          </div>
          <p className="text-xs text-ve-gray-500 mt-1">
            Category: <strong className="text-ve-gray-700">{link.category}</strong>
          </p>
        </div>
      </div>

      <ClickTrendChart
        title="Clicks, Last 30 Days"
        subtitle={`Daily redirects through go/${link.shortName}`}
        load={() => getLinkDailyClicks(link.id, 30)}
        reloadKey={`${link.id}:${link.clickCount}`}
      />

      {/* Additional Metadata Card */}
      <div className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ve-gray-700">
          Configuration & Audit Metadata
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex justify-between py-2 border-b border-ve-gray-100">
            <span className="text-ve-gray-500">Internal Unique Identifier</span>
            <span className="font-mono text-ve-gray-800">{link.id}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-ve-gray-100">
            <span className="text-ve-gray-500">Last Modified</span>
            <span className="font-mono text-ve-gray-800">{formatFullDateTime(link.updatedAt)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-ve-gray-100">
            <span className="text-ve-gray-500">DNS Resolution Mode</span>
            <span className="font-medium text-ve-gray-800">LAN Reverse Proxy / 307 Temporary Redirect</span>
          </div>
          <div className="flex justify-between py-2 border-b border-ve-gray-100">
            <span className="text-ve-gray-500">Search Tags</span>
            <span className="text-ve-gray-800">
              {link.tags && link.tags.length > 0 ? link.tags.join(', ') : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        link={link}
        loading={isDeleting}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />

      <DeactivateConfirmModal
        isOpen={isDeactivateModalOpen}
        link={link}
        loading={isToggling}
        onClose={() => setIsDeactivateModalOpen(false)}
        onConfirm={handleConfirmToggleStatus}
      />

      <QuickQRModal
        isOpen={isQrModalOpen}
        link={link}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
};
