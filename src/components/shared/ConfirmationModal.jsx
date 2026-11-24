import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  Trash2,
  HelpCircle,
  X,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

const ConfirmationModalContext = createContext(null);

const VARIANTS = {
  danger: {
    icon: Trash2,
    badgeBg: 'bg-rose-100 text-rose-700 ring-rose-200',
    primaryBtn: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-rose-600/20',
    headerAccent: 'border-rose-100',
  },
  warning: {
    icon: AlertTriangle,
    badgeBg: 'bg-amber-100 text-amber-700 ring-amber-200',
    primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-amber-600/20',
    headerAccent: 'border-amber-100',
  },
  info: {
    icon: Info,
    badgeBg: 'bg-sky-100 text-sky-700 ring-sky-200',
    primaryBtn: 'bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500 shadow-sky-600/20',
    headerAccent: 'border-sky-100',
  },
  success: {
    icon: CheckCircle2,
    badgeBg: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-emerald-600/20',
    headerAccent: 'border-emerald-100',
  },
};

export function ConfirmationModalProvider({ children }) {
  const [modalState, setModalState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [typedVerification, setTypedVerification] = useState('');
  const resolveRef = useRef(null);

  /**
   * confirm({
   *   title: string,
   *   message: string | ReactNode,
   *   confirmText?: string,
   *   cancelText?: string,
   *   variant?: 'danger' | 'warning' | 'info' | 'success',
   *   requireTypedText?: string, // e.g. "DELETE" or contract number
   *   confirmPhrasePlaceholder?: string,
   * }) -> Promise<boolean>
   */
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setTypedVerification('');
      setLoading(false);
      setModalState({
        title: options.title || '¿Estás seguro?',
        message: options.message || 'Esta acción no se puede deshacer.',
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        variant: options.variant || 'warning',
        requireTypedText: options.requireTypedText || null,
        confirmPhrasePlaceholder: options.confirmPhrasePlaceholder || options.requireTypedText || '',
        onConfirm: options.onConfirm || null,
      });
    });
  }, []);

  const handleClose = (result = false) => {
    if (loading) return;
    setModalState(null);
    setLoading(false);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  };

  const handleConfirmAction = async () => {
    if (modalState?.requireTypedText && typedVerification !== modalState.requireTypedText) {
      return;
    }

    if (modalState?.onConfirm) {
      try {
        setLoading(true);
        await modalState.onConfirm();
        handleClose(true);
      } catch (err) {
        setLoading(false);
        console.error('Modal onConfirm error:', err);
      }
    } else {
      handleClose(true);
    }
  };

  const currentVariant = modalState ? VARIANTS[modalState.variant] || VARIANTS.warning : VARIANTS.warning;
  const IconComponent = currentVariant.icon;
  const isConfirmDisabled =
    loading ||
    (modalState?.requireTypedText && typedVerification !== modalState.requireTypedText);

  return (
    <ConfirmationModalContext.Provider value={{ confirm }}>
      {children}

      {modalState && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 antialiased animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => handleClose(false)}
            aria-hidden="true"
          />

          {/* Modal Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-modal-title"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 transform transition-all duration-200 scale-100"
          >
            {/* Header bar */}
            <div className="flex items-start justify-between p-6 pb-4">
              <div className="flex items-center gap-4">
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-4 ${currentVariant.badgeBg}`}
                >
                  <IconComponent className="h-6 w-6" strokeWidth={2} />
                </div>
                <div>
                  <h3
                    id="confirmation-modal-title"
                    className="text-lg font-bold text-slate-900 leading-snug"
                  >
                    {modalState.title}
                  </h3>
                  <div className="mt-1 text-sm text-slate-600 leading-relaxed">
                    {modalState.message}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleClose(false)}
                disabled={loading}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Optional Typed Confirmation */}
            {modalState.requireTypedText && (
              <div className="px-6 py-3 bg-slate-50/70 border-y border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Para confirmar, escribe{' '}
                  <span className="font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold select-all">
                    {modalState.requireTypedText}
                  </span>{' '}
                  a continuación:
                </label>
                <input
                  type="text"
                  value={typedVerification}
                  onChange={(e) => setTypedVerification(e.target.value)}
                  placeholder={modalState.confirmPhrasePlaceholder}
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 bg-slate-50 px-6 py-4">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleClose(false)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-slate-400/20 disabled:opacity-50"
              >
                {modalState.cancelText}
              </button>
              <button
                type="button"
                disabled={isConfirmDisabled}
                onClick={handleConfirmAction}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold shadow-sm transition focus:outline-hidden focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${currentVariant.primaryBtn}`}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmationModalContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmationModalContext);
  if (!context) {
    // Graceful fallback if invoked outside of provider
    return {
      confirm: async ({ message, title }) => {
        return window.confirm(title ? `${title}\n\n${message}` : message);
      },
    };
  }
  return context;
}
