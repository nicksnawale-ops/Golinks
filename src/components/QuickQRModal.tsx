import React from 'react';
import { ExternalLink, QrCode, X } from 'lucide-react';
import { GoLink } from '../types/link';
import { generateQRMatrix } from '../utils/qrCode';
import { CopyButton } from './CopyButton';

interface QuickQRModalProps {
  link: GoLink | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickQRModal: React.FC<QuickQRModalProps> = ({ link, isOpen, onClose }) => {
  if (!isOpen || !link) return null;

  const qrMatrix = generateQRMatrix(link.targetUrl);
  const matrixSize = qrMatrix.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ve-black/50">
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-xl border border-ve-gray-200 p-6 overflow-hidden text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-ve-gray-400 hover:text-ve-gray-600 rounded-lg hover:bg-ve-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto w-10 h-10 rounded-full bg-ve-blue-50 text-ve-blue flex items-center justify-center mb-3">
          <QrCode className="w-5 h-5" />
        </div>

        <h3 className="text-base font-semibold text-ve-gray-900">
          Scan to open go/{link.shortName}
        </h3>
        <p className="text-xs text-ve-gray-500 mt-1">
          Scan with any mobile phone camera connected to the company Wi-Fi / LAN
        </p>

        {/* QR Code Canvas / SVG */}
        <div className="mt-4 p-4 bg-white border border-ve-gray-200 rounded-lg inline-block shadow-inner">
          <svg
            viewBox={`0 0 ${matrixSize} ${matrixSize}`}
            className="w-48 h-48 mx-auto shape-rendering-crispEdges"
            style={{ imageRendering: 'pixelated' }}
          >
            {qrMatrix.map((row, r) =>
              row.map((cell, c) =>
                cell ? (
                  <rect
                    key={`${r}-${c}`}
                    x={c}
                    y={r}
                    width={1}
                    height={1}
                    fill="#121722"
                  />
                ) : null
              )
            )}
          </svg>
        </div>

        <div className="mt-4 text-xs font-mono text-ve-gray-600 bg-ve-gray-50 py-1.5 px-3 rounded border border-ve-gray-200 truncate">
          {link.targetUrl}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <CopyButton text={`go/${link.shortName}`} label="Copy go/link" />
          <CopyButton text={link.targetUrl} label="Copy Target URL" />
        </div>
      </div>
    </div>
  );
};
