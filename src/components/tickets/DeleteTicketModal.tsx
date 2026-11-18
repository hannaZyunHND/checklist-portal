import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import type { Ticket } from '../../types/ticket';
import { ModalOrSheet } from '../ui/ModalOrSheet';

interface DeleteTicketModalProps {
  ticket: Ticket | null;
  onClose: () => void;
  onConfirmDelete: (ticket: Ticket) => Promise<void>;
}

export function DeleteTicketModal({
  ticket,
  onClose,
  onConfirmDelete,
}: DeleteTicketModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!ticket) return null;

  const handleConfirm = async () => {
    setError('');
    setDeleting(true);
    try {
      await onConfirmDelete(ticket);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể xóa ticket. Vui lòng kiểm tra lại Firestore Rules.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalOrSheet
      open={Boolean(ticket)}
      onClose={() => {
        if (!deleting) onClose();
      }}
      title="Xác nhận xóa Ticket"
      subtitle="Hành động này không thể hoàn tác"
      maxWidthClass="md:max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <div>
            <div>
              Bạn có chắc muốn xóa vĩnh viễn ticket{' '}
              <strong className="font-mono-code">{ticket.code}</strong>?
            </div>
            <div className="mt-1 font-semibold text-slate-900">{ticket.title}</div>
            <p className="mt-1 text-xs text-red-800">
              Toàn bộ lịch sử trạng thái và tệp đính kèm của ticket này cũng sẽ bị xóa.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleConfirm}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{deleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
          </button>
        </div>
      </div>
    </ModalOrSheet>
  );
}
