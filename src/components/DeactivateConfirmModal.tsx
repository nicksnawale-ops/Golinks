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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ve-black/50">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-ve-gray-200 p-6 overflow-hidden">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1 text-ve-gray-400 hover:text-ve-gray-600 rounded-lg hover:bg-ve-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              isCurrentlyActive ? 'bg-ve-navy-50 text-ve-navy' : 'bg-ve-cyan-50 text-ve-navy'
            }`}
          >
            {isCurrentlyActive ? (
              <PauseCircle className="w-6 h-6" />
            ) : (
              <PlayCircle className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-ve-gray-900">
              {isCurrentlyActive
                ? `Deactivate go/${link.shortName}?`
                : `Reactivate go/${link.shortName}?`}
            </h3>
            <p className="mt-2 text-sm text-ve-gray-600">
              {isCurrentlyActive ? (
                <>
                  When deactivated, employees visiting{' '}
                  <span className="font-mono font-semibold text-ve-gray-800">
                    go/{link.shortName}
                  </span>{' '}
                  will see a <em>"This link has been disabled"</em> notice instead of being redirected.
                </>
              ) : (
                <>
                  Reactivating this link will immediately restore automatic redirection for all employees navigating to{' '}
                  <span className="font-mono font-semibold text-ve-gray-800">
                    go/{link.shortName}
                  </span>
                  .
                </>
              )}
            </p>

            <div className="mt-3 p-2.5 bg-ve-gray-50 border border-ve-gray-200 rounded text-xs font-mono text-ve-gray-700 break-all">
              Destination: {link.targetUrl}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-ve-gray-700 bg-white border border-ve-gray-300 hover:bg-ve-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors ${
              isCurrentlyActive
                ? 'bg-ve-navy hover:bg-ve-navy active:bg-ve-navy'
                : 'bg-ve-navy hover:bg-ve-navy active:bg-ve-navy'
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
