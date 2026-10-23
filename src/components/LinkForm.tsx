import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  HelpCircle,
  Info,
  Lock,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  getCategories,
  normalizeShortName,
  validateShortName,
  validateTargetUrl,
} from '../services/linkService';
import { CreateLinkInput, GoLink, LinkVisibility, UpdateLinkInput } from '../types/link';
import { useAuth } from '../context/AuthContext';

interface LinkFormProps {
  initialValues?: Partial<GoLink>;
  isEditing?: boolean;
  onSubmit: (data: CreateLinkInput | UpdateLinkInput) => Promise<void>;
  onCancel: () => void;
  submitButtonText?: string;
}

export const LinkForm: React.FC<LinkFormProps> = ({
  initialValues,
  isEditing = false,
  onSubmit,
  onCancel,
  submitButtonText = isEditing ? 'Save Changes' : 'Create Shortcut',
}) => {
  const { currentUser, isAdmin, availableUsers } = useAuth();
  const [shortName, setShortName] = useState(initialValues?.shortName || '');
  const [targetUrl, setTargetUrl] = useState(initialValues?.targetUrl || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [category, setCategory] = useState(initialValues?.category || 'General');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [owner, setOwner] = useState(
    initialValues?.owner || currentUser?.email || 'nikhil.nawale01@gmail.com'
  );
  const [visibility, setVisibility] = useState<LinkVisibility>(initialValues?.visibility || 'public');
  const [isActive, setIsActive] = useState<boolean>(
    initialValues?.isActive !== undefined ? initialValues.isActive : true
  );
  const [tagsInput, setTagsInput] = useState((initialValues?.tags || []).join(', '));

  // Validation states
  const [shortNameError, setShortNameError] = useState<string | null>(null);
  const [shortNameSuccess, setShortNameSuccess] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [categoriesList, setCategoriesList] = useState<string[]>(['HR', 'IT', 'Finance', 'Engineering', 'General']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load available categories
  useEffect(() => {
    getCategories().then((cats) => {
      const filtered = cats.filter((c) => c !== 'All');
      setCategoriesList(filtered);
      if (initialValues?.category && !filtered.includes(initialValues.category)) {
        const catToAdd = initialValues.category;
        setCategoriesList((prev) => [...prev, catToAdd]);
      }
    });
  }, [initialValues]);

  // Live validation for shortName as the user types
  useEffect(() => {
    let active = true;
    const trimmed = shortName.trim();
    if (!trimmed) {
      setShortNameError(null);
      setShortNameSuccess(false);
      return;
    }

    const timer = setTimeout(async () => {
      const result = await validateShortName(trimmed, initialValues?.id);
      if (!active) return;
      if (!result.valid) {
        setShortNameError(result.error || 'Invalid short name');
        setShortNameSuccess(false);
      } else {
        setShortNameError(null);
        setShortNameSuccess(true);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [shortName, initialValues?.id]);

  // Live validation for targetUrl
  useEffect(() => {
    const trimmed = targetUrl.trim();
    if (!trimmed) {
      setUrlError(null);
      return;
    }

    const result = validateTargetUrl(trimmed);
    if (!result.valid) {
      setUrlError(result.error || 'Invalid URL');
    } else {
      setUrlError(null);
    }
  }, [targetUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const norm = normalizeShortName(shortName);
    const shortCheck = await validateShortName(norm, initialValues?.id);
    if (!shortCheck.valid) {
      setShortNameError(shortCheck.error || 'Invalid short name');
      return;
    }

    const urlCheck = validateTargetUrl(targetUrl);
    if (!urlCheck.valid) {
      setUrlError(urlCheck.error || 'Invalid URL');
      return;
    }

    const finalCategory = showCustomCategory && customCategory.trim()
      ? customCategory.trim()
      : category;

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      await onSubmit({
        shortName: norm,
        targetUrl: targetUrl.trim(),
        description: description.trim(),
        category: finalCategory,
        owner: owner.trim(),
        visibility,
        isActive,
        tags: parsedTags,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save link';
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizedPreview = normalizeShortName(shortName) || 'shortcut';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {generalError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Live Preview Box */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Live Resolution Preview</span>
          <span className="text-emerald-400 font-mono">LAN Gateway Active</span>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-sm sm:text-base">
          <div className="text-blue-400 font-bold bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/60 truncate">
            go/{normalizedPreview}
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 hidden sm:block shrink-0" />
          <div className="text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/60 truncate flex-1">
            {targetUrl ? targetUrl : 'https://...'}
          </div>
        </div>
        {targetUrl.includes('%s') && (
          <p className="text-xs text-blue-300 mt-2 font-mono">
            Parameter substitution detected: go/{normalizedPreview}/1234 will forward to{' '}
            {targetUrl.replace('%s', '1234')}
          </p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-xs">
        {/* Short Name Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Short Link Name <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            The word or path employees type after <code className="font-mono text-slate-700">go/</code>.
          </p>
          <div className="mt-1.5 relative flex items-center">
            <span className="inline-flex items-center px-3 py-2 text-sm font-mono font-semibold text-blue-600 bg-slate-50 border border-r-0 border-slate-300 rounded-l-lg select-none">
              go/
            </span>
            <input
              type="text"
              required
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. hr, payroll, jira, it-help"
              className={`w-full py-2 px-3 text-sm font-mono bg-white border rounded-r-lg focus:outline-hidden ${
                shortNameError
                  ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : shortNameSuccess
                  ? 'border-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
              }`}
            />
            {shortNameSuccess && !shortNameError && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Available</span>
              </div>
            )}
          </div>
          {shortNameError && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{shortNameError}</span>
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-400">
            Allowed: lowercase a-z, 0-9, hyphens (-), underscores (_), and slashes (/). 2–50 characters.
          </p>
        </div>

        {/* Target URL Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Target Destination URL <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            The full intranet or web URL employees are forwarded to.
          </p>
          <div className="mt-1.5 relative flex items-center">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Globe className="w-4 h-4" />
            </div>
            <input
              type="url"
              required
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://workday.company.internal/hr or https://jira.internal/browse/%s"
              className={`w-full pl-9 pr-3 py-2 text-sm font-mono bg-white border rounded-lg focus:outline-hidden ${
                urlError
                  ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
              }`}
            />
          </div>
          {urlError ? (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{urlError}</span>
            </p>
          ) : (
            <div className="mt-1.5 p-2 bg-blue-50/60 border border-blue-100 rounded text-xs text-blue-900 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Dynamic parameter support:</strong> Use <code className="font-mono text-blue-800 bg-white px-1 py-0.5 rounded border border-blue-200">%s</code> in the URL (e.g., <code className="font-mono text-blue-800">https://jira/browse/%s</code>) to substitute path arguments like <code className="font-mono text-blue-800">go/jira/1234</code>. Suffixes also auto-append if omitted!
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Description <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief explanation of what this link points to so coworkers can easily discover it..."
            className="mt-1.5 w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400"
          />
        </div>

        {/* Category & Visibility Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Category */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Department / Category
              </label>
              <button
                type="button"
                onClick={() => setShowCustomCategory(!showCustomCategory)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {showCustomCategory ? 'Choose existing' : '+ Custom Category'}
              </button>
            </div>
            {showCustomCategory ? (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Legal, Marketing, DevOps"
                className="mt-1.5 w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Access Visibility
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-left flex items-center gap-2 transition-colors ${
                  visibility === 'public'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div>
                  <div className="leading-none">Public</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">All employees</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-left flex items-center gap-2 transition-colors ${
                  visibility === 'private'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <div>
                  <div className="leading-none">Private</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">Owner only</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Owner & Tags Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Owner Email
              </label>
              {isAdmin && (
                <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
                  Admin: Can Reassign
                </span>
              )}
            </div>
            {isAdmin ? (
              <div className="mt-1.5 space-y-1">
                <input
                  type="email"
                  required
                  list="owners-list"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="name@company.internal"
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono"
                />
                <datalist id="owners-list">
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name} ({u.department})
                    </option>
                  ))}
                </datalist>
                <p className="text-[10px] text-slate-400">
                  Select an employee from the directory or enter a custom email.
                </p>
              </div>
            ) : (
              <div className="mt-1.5">
                <input
                  type="text"
                  disabled
                  value={owner}
                  className="w-full py-2 px-3 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Assigned to your account. Only Admins can reassign ownership.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Tags <span className="text-slate-400 font-normal">(Comma separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. onboarding, docs, tools"
              className="mt-1.5 w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Active Switch */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Enable Shortcut</div>
            <div className="text-xs text-slate-500">
              Active shortcuts instantly redirect employees on the network.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              isActive ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                isActive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !!shortNameError || !!urlError}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 rounded-lg shadow-xs transition-colors"
        >
          {isSubmitting ? (
            <span>Saving...</span>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>{submitButtonText}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
