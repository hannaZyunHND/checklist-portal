import { Link } from 'react-router-dom';
import { ChevronRight, Paperclip, Trash2 } from 'lucide-react';
import { getOfficeProgress } from '../../domain/ticketStateMachine';
import { isTicketOverdue } from '../../domain/ticketStats';
import type { Ticket } from '../../types/ticket';
import { formatOverdueDuration, formatVietnamDateTime } from '../../utils/dateTime';
import { OverdueBadge, TicketGroupBadge, TicketStatusBadge } from '../ui/StatusBadge';
import { UserAvatar } from '../ui/UserAvatar';

interface TicketTableProps {
  tickets: Ticket[];
  nowMs: number;
  canDeleteTicket?: (ticket: Ticket) => boolean;
  onDeleteTicket?: (ticket: Ticket) => void;
}

export function TicketTable({
  tickets,
  nowMs,
  canDeleteTicket,
  onDeleteTicket,
}: TicketTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <th className="px-4 py-3">Mã ID</th>
              <th className="px-4 py-3">Nhóm &amp; Tiêu đề</th>
              <th className="px-4 py-3">Người khởi tạo</th>
              <th className="px-4 py-3">Vai trò thực hiện</th>
              <th className="px-4 py-3">Thời gian tạo</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tickets.map((ticket) => {
              const overdue = isTicketOverdue(ticket, nowMs);
              const progress = getOfficeProgress(ticket);
              return (
                <tr
                  key={ticket.id}
                  className={`transition hover:bg-slate-50 ${
                    overdue ? 'border-l-4 border-l-amber-500 bg-amber-50/60 hover:bg-amber-50' : ''
                  }`}
                >
                  <td className="px-4 py-3.5 align-top">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="font-mono-code font-semibold text-teal-700 hover:underline"
                    >
                      {ticket.code}
                    </Link>
                  </td>
                  <td className="max-w-md px-4 py-3.5 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TicketGroupBadge groupType={ticket.groupType} />
                      {overdue && <OverdueBadge />}
                      {(ticket.attachmentCount ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          <Paperclip className="h-3 w-3" aria-hidden="true" />
                          <span>{ticket.attachmentCount} tệp</span>
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="mt-1.5 block font-semibold text-slate-900 hover:text-teal-700"
                    >
                      {ticket.title}
                    </Link>
                    {ticket.sku && (
                      <div className="font-mono-code mt-0.5 text-xs text-slate-500">
                        SKU: {ticket.sku}
                      </div>
                    )}
                    {ticket.expectedSku && (
                      <div className="font-mono-code mt-0.5 text-xs text-slate-500">
                        SKU dự kiến: {ticket.expectedSku}
                      </div>
                    )}
                    {ticket.groupType === 'OFFICE' && (
                      <div className="mt-1 text-xs font-medium text-blue-700">
                        Tiến độ nhóm: {progress.completed}/{progress.total} nhân sự xong
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="text-xs font-semibold text-slate-800">{ticket.createdByName}</div>
                    <div className="text-[11px] text-slate-500">{ticket.createdByEmail}</div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex flex-col gap-1.5">
                      {ticket.assigneeIds.slice(0, 3).map((uid) => {
                        const snap = ticket.assigneeSnapshots[uid];
                        return (
                          <div key={uid} className="flex items-center gap-2">
                            <UserAvatar
                              name={snap?.displayName || uid}
                              avatarDataUrl={snap?.avatarDataUrl}
                              size="xs"
                            />
                            <span className="truncate text-xs font-medium text-slate-700">
                              {snap?.displayName || uid}
                            </span>
                          </div>
                        );
                      })}
                      {ticket.assigneeIds.length > 3 && (
                        <span className="text-xs text-slate-500">
                          +{ticket.assigneeIds.length - 3} nhân sự khác
                        </span>
                      )}
                      {ticket.groupType !== 'EDIT_OLD' && ticket.reviewerName && (
                        <div className="text-[11px] text-violet-700">
                          PD duyệt: <strong>{ticket.reviewerName}</strong>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="font-mono-code text-xs text-slate-600">
                      {formatVietnamDateTime(ticket.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="font-mono-code text-xs font-medium text-slate-800">
                      {formatVietnamDateTime(ticket.deadline)}
                    </div>
                    {overdue && (
                      <div className="mt-1 text-xs font-semibold text-amber-800">
                        {formatOverdueDuration(ticket.deadline, nowMs)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right align-top">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <span>Mở</span>
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      {canDeleteTicket?.(ticket) && onDeleteTicket && (
                        <button
                          type="button"
                          onClick={() => onDeleteTicket(ticket)}
                          aria-label={`Xóa ticket ${ticket.code}`}
                          title={`Xóa ticket ${ticket.code}`}
                          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-red-200 bg-white px-2 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
