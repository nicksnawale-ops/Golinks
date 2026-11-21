import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { GoLink } from '../types/link';

interface DeleteConfirmModalProps {
  link: GoLink | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  link,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  if (!isOpen || !link) return null;

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
          <div className="p-2.5 rounded-lg bg-ve-navy-50 text-ve-navy shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ve-gray-900">
              Delete shortcut go/{link.shortName}?
            </h3>
            <p className="mt-2 text-sm text-ve-gray-600">
              This action cannot be undone. Employees navigating to{' '}
              <span className="font-mono font-semibold text-ve-gray-800">go/{link.shortName}</span>{' '}
              will no longer be redirected to:
            </p>
            <div className="mt-2 p-2 bg-ve-gray-50 border border-ve-gray-200 rounded text-xs font-mono text-ve-gray-700 break-all">
              {link.targetUrl}
            </div>
            <p className="mt-3 text-xs text-ve-gray-500">
              This link has accumulated{' '}
              <strong className="font-mono text-ve-gray-700">{link.clickCount}</strong> total clicks.
            </p>
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-ve-gray-900 hover:bg-ve-black active:bg-ve-black rounded-lg shadow-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? 'Deleting...' : 'Delete Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
