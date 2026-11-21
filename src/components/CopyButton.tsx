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
          ? 'bg-ve-cyan-50 text-ve-navy border-ve-cyan-300'
          : 'bg-white hover:bg-ve-gray-50 text-ve-gray-700 border-ve-gray-200 hover:border-ve-gray-300 shadow-2xs'
      } ${sizeClasses} ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-ve-navy stroke-[2.5]" />
          {!showIconOnly && <span className="font-semibold text-ve-navy">Copied</span>}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-ve-gray-500" />
          {!showIconOnly && <span>{label}</span>}
        </>
      )}
    </button>
  );
};
