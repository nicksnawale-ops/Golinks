import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'error';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast notifications container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          /* UDS toast: white surface, elevation-2; colour only on the icon. Errors use Deep Navy. */
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border shadow-md text-sm transition-all ${
              toast.type === 'error'
                ? 'bg-ve-navy text-white border-ve-navy'
                : 'bg-white text-ve-gray-900 border-ve-gray-200'
            }`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 mt-0.5 text-ve-blue shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 text-ve-cyan shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 mt-0.5 text-ve-blue shrink-0" />}
              <span className="font-medium">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
              className={`p-1 rounded transition-colors ${
                toast.type === 'error' ? 'text-ve-gray-300 hover:text-white' : 'text-ve-gray-400 hover:text-ve-gray-900'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
