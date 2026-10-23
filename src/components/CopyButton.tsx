import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  showIconOnly?: boolean;
  size?: 'sm' | 'md';
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label = 'Copy',
  className = '',
  showIconOnly = false,
  size = 'md',
}) => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      showToast(`Copied ${text} to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
      showToast(`Failed to copy to clipboard`, 'error');
    }
  };

  const sizeClasses =
    size === 'sm' ? 'px-2 py-1 text-xs gap-1' : 'px-2.5 py-1.5 text-xs font-medium gap-1.5';

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied to clipboard!' : `Copy "${text}"`}
      aria-label={copied ? 'Copied' : `Copy ${text}`}
      className={`inline-flex items-center justify-center rounded-md border transition-all duration-150 whitespace-nowrap shrink-0 ${
        copied
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700'
      } ${sizeClasses} ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
          {!showIconOnly && <span className="font-semibold text-emerald-700">Copied</span>}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-slate-500" />
          {!showIconOnly && <span>{label}</span>}
        </>
      )}
    </button>
  );
};
