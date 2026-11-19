import { Link } from 'react-router-dom';
import { CalendarClock, ChevronRight, Paperclip } from 'lucide-react';
import { getOfficeProgress } from '../../domain/ticketStateMachine';
import { isTicketOverdue } from '../../domain/ticketStats';
import type { Ticket } from '../../types/ticket';
import { formatOverdueDuration, formatVietnamDateTime } from '../../utils/dateTime';
import { OverdueBadge, TicketGroupBadge, TicketStatusBadge } from '../ui/StatusBadge';
import { UserAvatar } from '../ui/UserAvatar';

interface TicketCardListProps {
  tickets: Ticket[];
  nowMs: number;
}

export function TicketCardList({ tickets, nowMs }: TicketCardListProps) {
  return (
    <div className="space-y-3 md:hidden">
      {tickets.map((ticket) => {
        const overdue = isTicketOverdue(ticket, nowMs);
        const progress = getOfficeProgress(ticket);
        return (
          <Link
            key={ticket.id}
            to={`/tickets/${ticket.id}`}
            className={`block rounded-xl border bg-white p-4 transition active:scale-[0.99] ${
              overdue
                ? 'border-amber-400 border-l-4 border-l-amber-500 bg-amber-50/40'
                : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono-code text-xs font-bold text-teal-700">
                  {ticket.code}
                </span>
                <TicketGroupBadge groupType={ticket.groupType} />
                {(ticket.attachmentCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                    <Paperclip className="h-3 w-3" aria-hidden="true" />
                    <span>{ticket.attachmentCount}</span>
                  </span>
                )}
              </div>
              {overdue && <OverdueBadge />}
            </div>

            <h3 className="mt-2 line-clamp-2 text-base font-semibold text-slate-900">
              {ticket.title}
            </h3>

            {(ticket.sku || ticket.expectedSku) && (
              <p className="font-mono-code mt-1 text-xs text-slate-600">
                {ticket.sku ? `SKU: ${ticket.sku}` : `SKU dự kiến: ${ticket.expectedSku}`}
              </p>
            )}

            {ticket.groupType === 'OFFICE' && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs font-medium text-blue-800">
                  <span>Tiến độ nhân sự</span>
                  <span>
                    {progress.completed}/{progress.total}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-teal-600"
                    style={{
                      width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  {ticket.assigneeIds.slice(0, 2).map((uid) => {
                    const snap = ticket.assigneeSnapshots[uid];
                    return (
                      <UserAvatar
                        key={uid}
                        name={snap?.displayName || uid}
                        avatarDataUrl={snap?.avatarDataUrl}
                        size="xs"
                      />
                    );
                  })}
                  <span className="text-xs text-slate-700">
                    {ticket.assigneeIds.length === 1
                      ? ticket.assigneeSnapshots[ticket.assigneeIds[0]]?.displayName || 'OM'
                      : `${ticket.assigneeIds.length} nhân sự`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Khởi tạo: <span className="font-medium text-slate-700">{ticket.createdByName}</span>
                </div>
              </div>

              <div className="text-right text-xs text-slate-600">
                <div className="flex items-center justify-end gap-1">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="font-mono-code">Hạn: {formatVietnamDateTime(ticket.deadline)}</span>
                </div>
                <div className="font-mono-code mt-0.5 text-[11px] text-slate-400">
                  Tạo: {formatVietnamDateTime(ticket.createdAt)}
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <TicketStatusBadge status={ticket.status} />
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-teal-700">
                {overdue ? formatOverdueDuration(ticket.deadline, nowMs) : 'Xem chi tiết'}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
