import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Upload,
  X,
} from 'lucide-react';
import { CsvImportPreview, downloadCsvFile, parseAndValidateCsv } from '../services/csvService';
import { GoLink } from '../types/link';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLinks: GoLink[];
  onImportConfirm: (
    rows: Array<{
      shortName: string;
      targetUrl: string;
      description: string;
      category: string;
    }>
  ) => Promise<number>;
}

const SAMPLE_CSV = `shortName,targetUrl,description,category
figma,https://figma.com/@company,Brand assets and product UI files,Design
github,https://github.com/company-org,Company source code repositories,Engineering
notion,https://notion.so/company-workspace,Central project trackers,General
zoom-allhands,https://zoom.us/j/9988776655,Weekly company-wide all-hands meeting,General`;

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  existingLinks,
  onImportConfirm,
}) => {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setCsvText(text);
    if (!text.trim()) {
      setPreview(null);
      return;
    }
    const result = parseAndValidateCsv(text, existingLinks);
    setPreview(result);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    handleTextChange(SAMPLE_CSV);
  };

  const handleConfirm = async () => {
    if (!preview || preview.validCount === 0) return;
    try {
      setIsSubmitting(true);
      const validRowsToImport = preview.rows
        .filter((r) => r.isValid)
        .map((r) => ({
          shortName: r.shortName,
          targetUrl: r.targetUrl,
          description: r.description,
          category: r.category,
        }));

      const count = await onImportConfirm(validRowsToImport);
      setImportSummary(`Successfully imported ${count} shortcuts into the directory!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import CSV';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bulk Import GoLinks from CSV</h2>
              <p className="text-xs text-slate-500">
                Upload or paste a CSV file with automatic pre-import validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {importSummary && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{importSummary}</span>
            </div>
          )}

          {/* Upload / Input Controls */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                CSV Data (shortName, targetUrl, description, category)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Load Sample Template
                </button>
                <span className="text-slate-300">·</span>
                <label className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .csv File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="shortName,targetUrl,description,category&#10;figma,https://figma.com/files,Design UI,Engineering&#10;zoom,https://zoom.us/my/room,Weekly standup,General"
              className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Validation Preview Table */}
          {preview && preview.totalRows > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="text-slate-700">
                    Total Rows: <strong className="font-mono">{preview.totalRows}</strong>
                  </span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Ready to Import: <strong className="font-mono">{preview.validCount}</strong>
                  </span>
                  {preview.errorCount > 0 && (
                    <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      Errors: <strong className="font-mono">{preview.errorCount}</strong>
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">Only valid rows will be imported</span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-12 text-center">Row</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Shortcut</th>
                      <th className="py-2 px-3">Target URL</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Validation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {preview.rows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/40 hover:bg-red-50/70'}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-sans">
                          {row.rowNumber}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-red-700 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                              <span>Error</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-blue-700">
                          go/{row.shortName || '???'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-xs" title={row.targetUrl}>
                          {row.targetUrl || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-sans">{row.category}</td>
                        <td className="py-2 px-3 font-sans text-xs">
                          {row.isValid ? (
                            <span className="text-slate-400">Ready to save</span>
                          ) : (
                            <span className="text-red-600 font-medium">{row.errors.join('; ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !preview || preview.validCount === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>
              {isSubmitting
                ? 'Importing...'
                : preview
                ? `Import ${preview.validCount} Valid Shortcut${preview.validCount === 1 ? '' : 's'}`
                : 'Import Shortcuts'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
