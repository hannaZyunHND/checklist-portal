import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalOrSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function ModalOrSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'md:max-w-xl',
}: ModalOrSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[1px] md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-sheet-title"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white md:rounded-2xl ${maxWidthClass}`}
        style={{ overscrollBehavior: 'contain' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5 md:px-6 md:py-4">
          <div className="min-w-0">
            <h2 id="modal-sheet-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 md:px-6 md:py-5">{children}</div>
      </div>
    </div>
  );
}
