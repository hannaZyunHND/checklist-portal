import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Paperclip, Trash2 } from 'lucide-react';
import {
  ATTACHMENT_ACCEPT_ATTR,
  formatFileSize,
  isImageAttachment,
  MAX_ATTACHMENTS_PER_TICKET,
  validateAttachmentFile,
} from '../../services/r2Service';
import type { TicketAttachmentDraft } from '../../types/ticket';

interface ImageAttachmentPickerProps {
  attachments: TicketAttachmentDraft[];
  onChange: (next: TicketAttachmentDraft[]) => void;
  maxFiles?: number;
}

function getDocBadge(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) {
    return {
      label: 'EXCEL',
      bg: 'bg-emerald-50 text-emerald-700',
      Icon: FileSpreadsheet,
    };
  }
  if (lower.endsWith('.pdf')) {
    return {
      label: 'PDF',
      bg: 'bg-red-50 text-red-700',
      Icon: FileText,
    };
  }
  return {
    label: 'WORD',
    bg: 'bg-blue-50 text-blue-700',
    Icon: FileText,
  };
}

export function ImageAttachmentPicker({
  attachments,
  onChange,
  maxFiles = MAX_ATTACHMENTS_PER_TICKET,
}: ImageAttachmentPickerProps) {
  const [error, setError] = useState('');

  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setError('');
    const remaining = maxFiles - attachments.length;
    if (remaining <= 0) {
      setError(`Tối đa ${maxFiles} tệp đính kèm cho mỗi ticket.`);
      return;
    }

    const slice = files.slice(0, remaining);
    const errorsFound: string[] = [];
    const nextItems: TicketAttachmentDraft[] = [];

    for (const file of slice) {
      const validationError = validateAttachmentFile(file);
      if (validationError) {
        errorsFound.push(validationError);
        continue;
      }

      const isImage = isImageAttachment(file.type, file.name);
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      nextItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name || `anh-${Date.now()}.png`,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        file,
        previewUrl,
      });
    }

    if (files.length > remaining) {
      errorsFound.push(`Chỉ cho phép tối đa ${maxFiles} tệp/ticket.`);
    }
    if (errorsFound.length > 0) {
      setError(errorsFound[0]);
    }
    if (nextItems.length > 0) {
      onChange([...attachments, ...nextItems]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items
      .filter((it) => it.kind === 'file')
      .map((it) => it.getAsFile())
      .filter((f): f is File => Boolean(f));
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const removeAttachment = (id: string) => {
    const target = attachments.find((a) => a.id === id);
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onChange(attachments.filter((item) => item.id !== id));
  };

  return (
    <div
      onPaste={handlePaste}
      className="space-y-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-slate-800">
            Tệp đính kèm — Ảnh, PDF, Word (.docx), Excel (.xlsx)
          </div>
          <div className="text-[11px] text-slate-500">
            Lưu trên Cloudflare R2 · Tối đa <strong>5MB/tệp</strong>, {maxFiles} tệp/ticket · Hỗ trợ{' '}
            <strong>Ctrl+V</strong> dán ảnh chụp màn hình.
          </div>
        </div>

        <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border border-teal-600 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-50">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          <span>Chọn tệp / Ảnh</span>
          <input
            type="file"
            accept={ATTACHMENT_ACCEPT_ATTR}
            multiple
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      {attachments.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {attachments.map((att) => {
            const isImg = Boolean(att.previewUrl);
            const docBadge = getDocBadge(att.name);
            const DocIcon = docBadge.Icon;
            return (
              <div
                key={att.id}
                className="flex items-center gap-2.5 overflow-hidden rounded-lg border border-slate-200 bg-white p-2"
              >
                {isImg ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    className="h-12 w-12 shrink-0 rounded-md border border-slate-200 object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md ${docBadge.bg}`}
                  >
                    <DocIcon className="h-4 w-4" aria-hidden="true" />
                    <span className="mt-0.5 text-[9px] font-bold">{docBadge.label}</span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-slate-800" title={att.name}>
                    {att.name}
                  </div>
                  <div className="font-mono-code text-[11px] text-slate-500">
                    {formatFileSize(att.sizeBytes)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  aria-label={`Xóa tệp ${att.name}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
