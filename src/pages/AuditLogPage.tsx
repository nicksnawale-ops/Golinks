import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  History,
  Search,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuditLogs } from '../services/auditService';
import { AuditAction, AuditLogEntry } from '../types/audit';
import { formatFullDateTime, formatRelativeTime } from '../utils/formatters';

interface AuditLogPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const AuditLogPage: React.FC<AuditLogPageProps> = ({ onNavigate }) => {
  const { isAdmin, currentUser } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [actorSearch, setActorSearch] = useState<string>('');
  const [shortNameSearch, setShortNameSearch] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getAuditLogs({
        action: actionFilter,
        actor: actorSearch,
        shortName: shortNameSearch,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, actorSearch, shortNameSearch]);

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-ve-navy-50 text-ve-navy flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-ve-gray-900 text-3xl font-semibold">Access Restricted to Administrators</h1>
        <p className="text-sm text-ve-gray-600 mt-2 max-w-md mx-auto">
          The enterprise audit log contains system governance and access change logs reserved for Administrators.
          Currently signed in as <strong className="text-ve-gray-800">{currentUser?.email}</strong> (Role: {currentUser?.role}).
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('directory')}
            className="px-4 py-2 text-xs font-semibold text-white bg-ve-blue hover:bg-ve-navy rounded-lg shadow-xs transition-colors"
          >
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('directory')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ve-gray-500 hover:text-ve-gray-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Directory</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-ve-navy-50 text-ve-navy rounded-lg">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-ve-gray-900 text-3xl font-semibold">
              Audit log
            </h1>
          </div>
          <p className="text-xs text-ve-gray-500 mt-1">
            Immutable log recording who created, edited, deleted, or deactivated shortcuts with full before-and-after change diffs.
          </p>
        </div>

      </div>

      {/* Filter Controls */}
      <div className="bg-white border border-ve-gray-200 rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Action Type Filter */}
        <div>
          <label className="block text-sm font-medium text-ve-gray-900 mb-2">
            Filter by Action
          </label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full text-xs font-medium bg-ve-gray-50 border border-ve-gray-400 rounded-lg px-2.5 h-10 text-ve-gray-800 focus:outline-hidden focus:border-ve-blue focus:bg-white"
          >
            <option value="all">All Actions</option>
            <option value="create">Created</option>
            <option value="edit">Edited</option>
            <option value="deactivate">Deactivated</option>
            <option value="activate">Reactivated</option>
            <option value="delete">Deleted</option>
            <option value="reassign_owner">Reassigned Owner</option>
            <option value="bulk_import">Bulk CSV Imported</option>
          </select>
        </div>

        {/* Actor Search */}
        <div>
          <label className="block text-sm font-medium text-ve-gray-900 mb-2">
            Actor Name / Email
          </label>
          <div className="relative">
            <User className="w-3.5 h-3.5 text-ve-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              placeholder="Search by actor..."
              className="w-full text-xs bg-ve-gray-50 border border-ve-gray-400 rounded-lg pl-8 pr-2.5 h-10 text-ve-gray-800 focus:outline-hidden focus:border-ve-blue focus:bg-white"
            />
          </div>
        </div>

        {/* Shortcut Name Search */}
        <div>
          <label className="block text-sm font-medium text-ve-gray-900 mb-2">
            Shortcut go/name
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ve-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={shortNameSearch}
              onChange={(e) => setShortNameSearch(e.target.value)}
              placeholder="Search shortcut name..."
              className="w-full text-xs bg-ve-gray-50 border border-ve-gray-400 rounded-lg pl-8 pr-2.5 h-10 text-ve-gray-800 focus:outline-hidden focus:border-ve-blue focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="bg-white border border-ve-gray-200 rounded-xl p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-ve-gray-200 border-t-ve-navy mb-3" />
          <p className="text-xs text-ve-gray-500">Querying security audit records...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-ve-gray-200 rounded-xl p-12 text-center">
          <History className="w-8 h-8 text-ve-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-ve-gray-800">No audit events match your filter</h3>
          <p className="text-xs text-ve-gray-500 mt-1">Try clearing filters or performing a link action.</p>
        </div>
      ) : (
        <div className="bg-white border border-ve-gray-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-ve-gray-50/75 border-b border-ve-gray-200 text-ve-gray-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Shortcut</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Notes / Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ve-gray-100">
                {logs.map((entry) => {
                  const isExpanded = expandedRowId === entry.id;
                  const hasDiff = entry.oldValues || entry.newValues;

                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        onClick={() => hasDiff && setExpandedRowId(isExpanded ? null : entry.id)}
                        className={`transition-colors ${
                          hasDiff ? 'cursor-pointer hover:bg-ve-gray-50/80' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center text-ve-gray-400">
                          {hasDiff ? (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-ve-navy" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )
                          ) : null}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-ve-gray-600 font-mono">
                          <div className="font-semibold text-ve-gray-800">
                            {formatRelativeTime(entry.timestamp)}
                          </div>
                          <div className="text-[11px] text-ve-gray-400">
                            {formatFullDateTime(entry.timestamp)}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] capitalize ${
                              entry.action === 'create'
                                ? 'bg-ve-cyan-50 text-ve-navy border border-ve-cyan-200'
                                : entry.action === 'edit'
                                ? 'bg-ve-blue-50 text-ve-navy border border-ve-blue-200'
                                : entry.action === 'delete'
                                ? 'bg-ve-navy-50 text-ve-navy border border-ve-navy-200'
                                : entry.action === 'deactivate'
                                ? 'bg-ve-navy-50 text-ve-navy border border-ve-navy-200'
                                : entry.action === 'reassign_owner'
                                ? 'bg-ve-navy-50 text-ve-navy border border-ve-navy-200'
                                : 'bg-ve-gray-100 text-ve-gray-700'
                            }`}
                          >
                            {entry.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-ve-blue whitespace-nowrap">
                          go/{entry.shortName}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-ve-gray-800">{entry.actorName}</div>
                          <div className="text-[11px] text-ve-gray-400 font-mono">
                            {entry.actorEmail} ({entry.actorRole})
                          </div>
                        </td>
                        <td className="py-3 px-4 text-ve-gray-600 max-w-sm truncate">
                          {entry.notes || '—'}
                        </td>
                      </tr>

                      {/* Expandable Before & After Diff Box */}
                      {isExpanded && hasDiff && (
                        <tr className="bg-ve-gray-50/90 border-b border-ve-gray-200">
                          <td colSpan={6} className="p-4 pl-12">
                            <div className="text-xs font-semibold uppercase tracking-wider text-ve-gray-500 mb-2">
                              Audit State Mutation Details
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {entry.oldValues && (
                                <div className="p-3 bg-ve-navy-50/50 border border-ve-navy-200 rounded-lg">
                                  <div className="font-semibold text-ve-navy text-[11px] uppercase mb-1">
                                    Previous Values (Before)
                                  </div>
                                  <pre className="font-mono text-[11px] text-ve-navy whitespace-pre-wrap break-all">
                                    {JSON.stringify(entry.oldValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {entry.newValues && (
                                <div className="p-3 bg-ve-cyan-50/50 border border-ve-cyan-200 rounded-lg">
                                  <div className="font-semibold text-ve-navy text-[11px] uppercase mb-1">
                                    Updated Values (After)
                                  </div>
                                  <pre className="font-mono text-[11px] text-ve-navy whitespace-pre-wrap break-all">
                                    {JSON.stringify(entry.newValues, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-ve-gray-200 bg-ve-gray-50 text-xs text-ve-gray-500 flex items-center justify-between">
            <span>
              Events shown: <strong className="font-mono text-ve-gray-800">{logs.length}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
