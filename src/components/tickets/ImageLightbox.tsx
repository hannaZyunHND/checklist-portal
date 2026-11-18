import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';

export interface LightboxImageItem {
  id: string;
  name: string;
  src: string;
}

interface ImageLightboxProps {
  images: LightboxImageItem[];
  activeIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageLightbox({
  images,
  activeIndex,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && activeIndex > 0) onNavigate(activeIndex - 1);
      if (e.key === 'ArrowRight' && activeIndex < images.length - 1) onNavigate(activeIndex + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, images.length, onClose, onNavigate]);

  if (activeIndex === null || !images[activeIndex]) return null;
  const current = images[activeIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ảnh ${current.name}`}
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 text-sm font-medium">
          <span className="truncate">{current.name}</span>
          <span className="ml-2 text-xs text-slate-300">
            ({activeIndex + 1}/{images.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={current.src}
            target="_blank"
            rel="noopener noreferrer"
            download={current.name}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Tải / Mở gốc</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng xem ảnh"
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className="relative mt-3 flex flex-1 items-center justify-center overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(activeIndex - 1)}
            aria-label="Ảnh trước"
            className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-slate-800"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        )}

        <img
          src={current.src}
          alt={current.name}
          className="max-h-[80dvh] max-w-full rounded-lg object-contain"
        />

        {activeIndex < images.length - 1 && (
          <button
            type="button"
            onClick={() => onNavigate(activeIndex + 1)}
            aria-label="Ảnh tiếp theo"
            className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/80 text-white hover:bg-slate-800"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
