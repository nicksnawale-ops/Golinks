import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { LinkForm } from '../components/LinkForm';
import { CreateLinkInput, GoLink } from '../types/link';

interface CreateLinkPageProps {
  initialShortName?: string;
  onCreate: (data: CreateLinkInput) => Promise<GoLink>;
  onNavigate: (page: string, params?: any) => void;
}

export const CreateLinkPage: React.FC<CreateLinkPageProps> = ({
  initialShortName = '',
  onCreate,
  onNavigate,
}) => {
  const handleSave = async (data: CreateLinkInput | any) => {
    const created = await onCreate(data);
    onNavigate('details', { id: created.id });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb / Back button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => onNavigate('directory')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create New GoLink
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Set up an internal shortcut accessible to employees across the corporate LAN.
        </p>
      </div>

      <LinkForm
        initialValues={{
          shortName: initialShortName,
          category: 'General',
          visibility: 'public',
          isActive: true,
        }}
        onSubmit={handleSave}
        onCancel={() => onNavigate('directory')}
        submitButtonText="Create Shortcut"
      />
    </div>
  );
};
