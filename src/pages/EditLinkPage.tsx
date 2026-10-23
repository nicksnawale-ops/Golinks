import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { LinkForm } from '../components/LinkForm';
import { useAuth } from '../context/AuthContext';
import { canUserManageLink } from '../services/authService';
import { getLink } from '../services/linkService';
import { GoLink, UpdateLinkInput } from '../types/link';

interface EditLinkPageProps {
  id: string;
  onUpdate: (id: string, data: UpdateLinkInput) => Promise<GoLink>;
  onNavigate: (page: string, params?: any) => void;
}

export const EditLinkPage: React.FC<EditLinkPageProps> = ({ id, onUpdate, onNavigate }) => {
  const { currentUser, isAdmin } = useAuth();
  const [link, setLink] = useState<GoLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLink(id)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setError(`Link with ID "${id}" was not found.`);
        } else {
          setLink(data);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load link.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const handleSave = async (data: UpdateLinkInput) => {
    const updated = await onUpdate(id, data);
    onNavigate('details', { id: updated.id });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading shortcut details...</p>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-base font-semibold text-slate-900">{error || 'Shortcut not found'}</p>
        <button
          type="button"
          onClick={() => onNavigate('directory')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  // RBAC Permission check
  const hasPermission = canUserManageLink(currentUser, link);
  if (!hasPermission) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Permission Denied</h2>
        <p className="text-sm text-slate-600 mt-2">
          Employees can only edit their own shortcuts. Shortcut <strong className="font-mono text-slate-800">go/{link.shortName}</strong> is owned by <span className="font-semibold text-slate-800">{link.owner}</span>.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('details', { id })}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={() => onNavigate('directory')}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('details', { id })}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Shortcut Details</span>
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Edit go/{link.shortName}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Update the destination, description, or access permissions for this shortcut.
        </p>
      </div>

      <LinkForm
        isEditing
        initialValues={link}
        onSubmit={handleSave}
        onCancel={() => onNavigate('details', { id })}
        submitButtonText="Save Changes"
      />
    </div>
  );
};
