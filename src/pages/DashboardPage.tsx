import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Globe,
  History,
  Link as LinkIcon,
  Plus,
  Power,
  RotateCcw,
  Shield,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ClickTrendChart } from '../components/ClickTrendChart';
import { AnimatedNumber } from '../components/live/AnimatedNumber';
import { GhostRankingBars } from '../components/live/EmptyStateArt';
import { LiveIndicator } from '../components/live/LiveIndicator';
import { CopyButton } from '../components/CopyButton';
import { MissingLinksCard } from '../components/MissingLinksCard';
import { DeactivateConfirmModal } from '../components/DeactivateConfirmModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { useAuth } from '../context/AuthContext';
import { downloadCsvFile, exportLinksToCsv } from '../services/csvService';
import { getOverallDailyClicks } from '../services/linkService';
import { GoLink } from '../types/link';
import { formatNumber, formatRelativeTime } from '../utils/formatters';
import { getLinkHealth } from '../utils/linkHealth';

interface DashboardPageProps {
  links: GoLink[];
  onNavigate: (page: string, params?: any) => void;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentState: boolean) => Promise<GoLink>;
  onResolve: (path: string) => void;
  onOpenCsvImport?: () => void;
  /** Re-fetches links in the background; the dashboard calls it every 20 seconds while visible. */
  onRefresh?: () => Promise<void>;
}

const LIVE_INTERVAL_MS = 20_000;

/** Returns a class that makes a card glow briefly whenever `value` goes up (not on first render). */
function useBumpClass(value: number): string {
  const prev = useRef(value);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (value > prev.current) setBump((b) => b + 1);
    prev.current = value;
  }, [value]);
  useEffect(() => {
    if (!bump) return;
    const t = window.setTimeout(() => setBump(0), 1400);
    return () => window.clearTimeout(t);
  }, [bump]);
  return bump ? 've-card-bump' : '';
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  links,
  onNavigate,
  onDelete,
  onToggleActive,
  onResolve,
  onOpenCsvImport,
  onRefresh,
}) => {
  // Live: refresh quietly every 20s while the tab is visible, and as soon as it becomes visible again.
  const [lastUpdated, setLastUpdated] = useState<number | null>(() => Date.now());
  const [tabHidden, setTabHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  useEffect(() => {
    if (!onRefresh) return;
    let cancelled = false;
    const run = async () => {
      if (document.hidden) return;
      try {
        await onRefresh();
        if (!cancelled) setLastUpdated(Date.now());
      } catch {
        // keep showing the last good data
      }
    };
    const timer = window.setInterval(run, LIVE_INTERVAL_MS);
    const onVisibility = () => {
      setTabHidden(document.hidden);
      if (!document.hidden) run();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [onRefresh]);

  const { isAdmin, currentUser } = useAuth();
  const [deleteModalLink, setDeleteModalLink] = useState<GoLink | null>(null);
  const [deactivateModalLink, setDeactivateModalLink] = useState<GoLink | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Summary Metrics
  const totalLinks = links.length;
  const activeLinks = links.filter((l) => l.isActive).length;
  const totalClicks = links.reduce((sum, l) => sum + l.clickCount, 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const createdThisMonth = links.filter((l) => {
    const d = new Date(l.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const linksBump = useBumpClass(totalLinks);
  const clicksBump = useBumpClass(totalClicks);

  // 2. Top 10 Most-Used Links
  const top10Links = [...links]
    .sort((a, b) => b.clickCount - a.clickCount)
    .slice(0, 10)
    .map((l) => ({
      name: `go/${l.shortName}`,
      shortName: l.shortName,
      clicks: l.clickCount,
      category: l.category,
      id: l.id,
    }));

  // 3. Recently Added Links
  const recentlyAdded = [...links]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // 4. Stale Links Needing Review (90+ days inactive)
  const staleLinks = links.filter((l) => getLinkHealth(l).isStale);

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
    downloadCsvFile(csvData, `golinks_summary_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dashboard Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-ve-blue-50 text-ve-blue rounded-lg">
              <BarChart2 className="w-5 h-5" />
            </span>
            <h1 className="text-ve-gray-900 text-3xl font-semibold">
              Dashboard
            </h1>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-xs text-ve-gray-500">How your team's go links are being used.</p>
            {onRefresh && <LiveIndicator lastUpdated={lastUpdated} paused={tabHidden} />}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold text-ve-gray-900 bg-white border border-ve-gray-200 hover:bg-ve-gray-50 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-ve-gray-500" />
            <span>Export CSV</span>
          </button>

          {isAdmin && onOpenCsvImport && (
            <button
              type="button"
              onClick={onOpenCsvImport}
              className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold text-ve-blue bg-white border border-ve-blue hover:bg-ve-gray-50 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>
          )}


          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="sm:hidden inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold text-white bg-ve-blue hover:bg-ve-navy rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create link</span>
          </button>
        </div>
      </div>

      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Links */}
        <div className={`bg-white border border-ve-gray-200 rounded-xl p-4 sm:p-6 ${linksBump}`}>
          <div className="flex items-center justify-between text-[11px] leading-4 font-medium uppercase tracking-[0.08em] text-ve-gray-500">
            <span>Total links</span>
            <LinkIcon className="w-4 h-4 text-ve-gray-600" />
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums text-ve-navy">
            <AnimatedNumber value={totalLinks} showIncrease />
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-ve-gray-600">
            <span>{totalLinks === 0 ? 'None created yet' : 'In the directory'}</span>
          </div>
        </div>

        {/* Active Links */}
        <div className="bg-white border border-ve-gray-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between text-[11px] leading-4 font-medium uppercase tracking-[0.08em] text-ve-gray-500">
            <span>Active links</span>
            <CheckCircle2 className="w-4 h-4 text-ve-gray-600" />
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums text-ve-navy flex items-baseline gap-2">
            <AnimatedNumber value={activeLinks} />
            <span className="text-xs font-medium text-ve-gray-600">
              {totalLinks > 0 ? `${Math.round((activeLinks / totalLinks) * 100)}% active` : ''}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-ve-gray-600">
            <span>{totalLinks - activeLinks} paused/disabled</span>
          </div>
        </div>

        {/* Total Clicks */}
        <div className={`bg-white border border-ve-gray-200 rounded-xl p-4 sm:p-6 ${clicksBump}`}>
          <div className="flex items-center justify-between text-[11px] leading-4 font-medium uppercase tracking-[0.08em] text-ve-gray-500">
            <span>Total clicks</span>
            <Activity className="w-4 h-4 text-ve-gray-600" />
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums text-ve-navy">
            <AnimatedNumber value={totalClicks} showIncrease />
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-ve-gray-600">
            <span>Redirects since each link was created</span>
          </div>
        </div>

        {/* Created This Month */}
        <div className="bg-white border border-ve-gray-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between text-[11px] leading-4 font-medium uppercase tracking-[0.08em] text-ve-gray-500">
            <span>Created this month</span>
            <Calendar className="w-4 h-4 text-ve-gray-600" />
          </div>
          <div className="mt-2 text-4xl font-bold tabular-nums text-ve-navy">
            <AnimatedNumber value={createdThisMonth} />
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-ve-gray-600">
            <span>
              {now.toLocaleString('default', { month: 'long' })} {currentYear}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top 10 Most-Used Links (Bar Chart using Recharts) */}
      <div className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ve-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-ve-blue" />
              <span>Top 10 Most-Used Shortcuts</span>
            </h2>
            <p className="text-xs text-ve-gray-500 mt-0.5">
              Ranked by number of clicks
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {top10Links.every((l) => l.clicks === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <GhostRankingBars />
              <p className="text-sm font-medium text-ve-gray-700">
                {links.length === 0 ? 'No go links yet' : 'No clicks yet'}
              </p>
              <p className="text-sm text-ve-gray-500 mt-1 max-w-sm">
                {links.length === 0
                  ? 'Create your first link or import a list from CSV. The most-used ones will rank here.'
                  : 'Your most-used links rank here once people start opening them.'}
              </p>
              {links.length === 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('create')}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-ve-blue hover:bg-ve-navy rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create link</span>
                </button>
              )}
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={top10Links}
              margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={'#EEF1F6'}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: '#6B7485', fontSize: 11 }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={45}
              />
              <YAxis
                tick={{ fill: '#6B7485', fontSize: 11 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
              <Tooltip
                cursor={{ fill: 'rgba(30,99,255,0.06)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-ve-gray-800 text-white rounded-md shadow-md text-xs font-mono space-y-1 ">
                        <div className="font-bold text-ve-blue-400">{data.name}</div>
                        <div>Category: {data.category}</div>
                        <div className="text-ve-navy font-semibold">
                          {formatNumber(data.clicks)} total clicks
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="clicks"
                fill="#1E63FF"
                radius={[4, 4, 0, 0]}
                onClick={(entry) => onNavigate('details', { id: entry.id })}
                className="cursor-pointer hover:opacity-90 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Click trend (everyone) + missing links people asked for (admins) */}
      <div className={`grid grid-cols-1 gap-6 ${isAdmin ? 'lg:grid-cols-3' : ''}`}>
        <div className={isAdmin ? 'lg:col-span-2' : ''}>
          <ClickTrendChart
            title="Clicks, Last 30 Days"
            subtitle={isAdmin ? 'All go-link redirects per day' : 'Redirects per day across the links you can see'}
            load={getOverallDailyClicks}
            reloadKey={totalClicks}
          />
        </div>
        {isAdmin && <MissingLinksCard onCreate={(name) => onNavigate('create', { initialShortName: name })} />}
      </div>

      {/* Grid: Recently Added Links & Stale Links Needing Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Recently Added Links */}
        <div className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-ve-gray-100">
              <h3 className="text-sm font-semibold text-ve-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-ve-blue" />
                <span>Recently Added Shortcuts</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('directory')}
                className="text-xs text-ve-blue hover:underline flex items-center gap-0.5"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-ve-gray-100 mt-2">
              {recentlyAdded.length === 0 && (
                <p className="py-6 text-sm text-ve-gray-500 text-center">
                  New links will show up here as people add them.
                </p>
              )}
              {recentlyAdded.map((link) => (
                <div
                  key={link.id}
                  onClick={() => onNavigate('details', { id: link.id })}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-ve-gray-50/60 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-ve-blue">
                        go/{link.shortName}
                      </span>
                      <span className="text-[11px] text-ve-gray-400 font-medium">
                        {link.category}
                      </span>
                    </div>
                    <p className="text-xs text-ve-gray-500 truncate mt-0.5 max-w-xs">
                      {link.description || link.targetUrl}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-ve-gray-500">
                      {formatRelativeTime(link.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Stale Links Needing Review */}
        <div className="bg-white border border-ve-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-ve-gray-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-ve-navy" />
                <h3 className="text-sm font-semibold text-ve-gray-900">
                  Stale Links Needing Review
                </h3>
              </div>
              <span className="text-xs font-medium text-ve-navy bg-ve-navy-50 border border-ve-navy-200 px-2 py-0.5 rounded">
                {staleLinks.length} Flagged
              </span>
            </div>

            {staleLinks.length === 0 ? (
              <div className="py-12 text-center text-ve-gray-500">
                <CheckCircle2 className="w-8 h-8 text-ve-navy mx-auto mb-2" />
                <p className="text-xs font-semibold text-ve-gray-800">
                  All shortcuts healthy!
                </p>
                <p className="text-[11px] mt-0.5">
                  No links have been unaccessed for 90+ days.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-ve-gray-100 mt-2">
                {staleLinks.map((link) => {
                  const health = getLinkHealth(link);
                  return (
                    <div
                      key={link.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigate('details', { id: link.id })}
                            className="font-mono text-sm font-semibold text-ve-blue hover:underline"
                          >
                            go/{link.shortName}
                          </button>
                          <span className="text-[11px] text-ve-navy font-semibold bg-ve-navy-50 px-1.5 py-0.2 rounded border border-ve-navy-200">
                            {health.daysSinceAccess}d inactive
                          </span>
                        </div>
                        <p className="text-xs text-ve-gray-400 truncate mt-0.5">
                          Owner: {link.owner}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onNavigate('edit', { id: link.id })}
                          title="Review / Edit"
                          className="px-2 py-1 text-xs font-medium text-ve-gray-700 bg-ve-gray-100 hover:bg-ve-gray-200 rounded"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeactivateModalLink(link)}
                          title="Deactivate"
                          className="p-1 text-ve-navy hover:bg-ve-gray-100 rounded"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteModalLink(link)}
                          title="Delete"
                          className="p-1 text-ve-navy hover:bg-ve-gray-100 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
};
