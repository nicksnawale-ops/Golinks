import React, { useState } from 'react';
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
import { CopyButton } from '../components/CopyButton';
import { DeactivateConfirmModal } from '../components/DeactivateConfirmModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { downloadCsvFile, exportLinksToCsv } from '../services/csvService';
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
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  links,
  onNavigate,
  onDelete,
  onToggleActive,
  onResolve,
  onOpenCsvImport,
}) => {
  const { isDark } = useTheme();
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
            <span className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <BarChart2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Enterprise Shortcut Analytics & Governance
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time usage telemetry, shortcut health, and centralized DNS routing metrics.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {isAdmin && onOpenCsvImport && (
            <button
              type="button"
              onClick={onOpenCsvImport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bulk CSV Import</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('audit-log')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 rounded-lg transition-colors shadow-2xs"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Audit Log</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Link</span>
          </button>
        </div>
      </div>

      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Links */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Shortcuts</span>
            <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatNumber(totalLinks)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Configured on internal LAN</span>
          </div>
        </div>

        {/* Active Links */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Active Shortcuts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white flex items-baseline gap-2">
            <span>{formatNumber(activeLinks)}</span>
            <span className="text-xs font-sans font-semibold text-emerald-600 dark:text-emerald-400">
              {totalLinks > 0 ? `${Math.round((activeLinks / totalLinks) * 100)}% online` : '100%'}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{totalLinks - activeLinks} paused/disabled</span>
          </div>
        </div>

        {/* Total Clicks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Access Clicks</span>
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatNumber(totalClicks)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Enterprise network redirections</span>
          </div>
        </div>

        {/* Created This Month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Created This Month</span>
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatNumber(createdThisMonth)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              {now.toLocaleString('default', { month: 'long' })} {currentYear}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top 10 Most-Used Links (Bar Chart using Recharts) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Top 10 Most-Used Shortcuts</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked by total direct employee LAN click traffic
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live telemetry</span>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={top10Links}
              margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? '#1e293b' : '#f1f5f9'}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={45}
              />
              <YAxis
                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-slate-900 text-white rounded-lg shadow-xl text-xs font-mono space-y-1 border border-slate-700">
                        <div className="font-bold text-blue-400">{data.name}</div>
                        <div>Category: {data.category}</div>
                        <div className="text-emerald-400 font-semibold">
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
                fill="#2563EB"
                radius={[4, 4, 0, 0]}
                onClick={(entry) => onNavigate('details', { id: entry.id })}
                className="cursor-pointer hover:opacity-90 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Recently Added Links & Stale Links Needing Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Recently Added Links */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Recently Added Shortcuts</span>
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('directory')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {recentlyAdded.map((link) => (
                <div
                  key={link.id}
                  onClick={() => onNavigate('details', { id: link.id })}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                        go/{link.shortName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {link.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-xs">
                      {link.description || link.targetUrl}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatRelativeTime(link.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Stale Links Needing Review */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Stale Links Needing Review
                </h3>
              </div>
              <span className="text-xs font-medium text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                {staleLinks.length} Flagged
              </span>
            </div>

            {staleLinks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  All shortcuts healthy!
                </p>
                <p className="text-[11px] mt-0.5">
                  No links have been unaccessed for 90+ days.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
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
                            className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            go/{link.shortName}
                          </button>
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                            {health.daysSinceAccess}d inactive
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          Owner: {link.owner}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onNavigate('edit', { id: link.id })}
                          title="Review / Edit"
                          className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded"
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeactivateModalLink(link)}
                          title="Deactivate"
                          className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteModalLink(link)}
                          title="Delete"
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
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
