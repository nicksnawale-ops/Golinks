import React from 'react';
import { PauseCircle, PlayCircle, X } from 'lucide-react';
import { GoLink } from '../types/link';

interface DeactivateConfirmModalProps {
  link: GoLink | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export const DeactivateConfirmModal: React.FC<DeactivateConfirmModalProps> = ({
  link,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  if (!isOpen || !link) return null;

  const isCurrentlyActive = link.isActive;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 overflow-hidden">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              isCurrentlyActive ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {isCurrentlyActive ? (
              <PauseCircle className="w-6 h-6" />
            ) : (
              <PlayCircle className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {isCurrentlyActive
                ? `Deactivate go/${link.shortName}?`
                : `Reactivate go/${link.shortName}?`}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {isCurrentlyActive ? (
                <>
                  When deactivated, employees visiting{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    go/{link.shortName}
                  </span>{' '}
                  will see a <em>"This link has been disabled"</em> notice instead of being redirected.
                </>
              ) : (
                <>
                  Reactivating this link will immediately restore automatic redirection for all employees navigating to{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    go/{link.shortName}
                  </span>
                  .
                </>
              )}
            </p>

            <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-700 break-all">
              Destination: {link.targetUrl}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors ${
              isCurrentlyActive
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
            }`}
          >
            {isCurrentlyActive ? (
              <PauseCircle className="w-3.5 h-3.5" />
            ) : (
              <PlayCircle className="w-3.5 h-3.5" />
            )}
            <span>
              {loading
                ? isCurrentlyActive
                  ? 'Deactivating...'
                  : 'Activating...'
                : isCurrentlyActive
                ? 'Yes, Deactivate Link'
                : 'Yes, Activate Link'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
