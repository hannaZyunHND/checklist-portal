import { ArrowRight, ExternalLink, History } from 'lucide-react';
import {
  HISTORY_ACTION_LABELS,
  TICKET_STATUS_LABELS,
  type TicketHistoryEntry,
} from '../../types/ticket';
import { formatVietnamDateTime } from '../../utils/dateTime';
import { RoleBadge } from '../ui/StatusBadge';

export function TicketHistoryTimeline({ entries }: { entries: TicketHistoryEntry[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <History className="h-4 w-4 text-teal-700" aria-hidden="true" />
        <h2 className="text-base font-semibold text-slate-900">
          Lịch sử thay đổi trạng thái ({entries.length})
        </h2>
      </div>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Chưa có bản ghi lịch sử.</p>
      ) : (
        <ol className="relative mt-4 space-y-5 border-l border-slate-200 pl-5">
          {entries.map((item) => (
            <li key={item.id} className="relative">
              <span
                className="absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full border-2 border-white bg-teal-600 ring-2 ring-teal-100"
                aria-hidden="true"
              />
              <div className="flex flex-wrap items-center justify-between gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900">{item.actorName}</span>
                  <RoleBadge role={item.actorRole} />
                </div>
                <time className="font-mono-code text-xs text-slate-500">
                  {formatVietnamDateTime(item.createdAt, true)}
                </time>
              </div>

              <div className="mt-1 text-xs font-semibold text-slate-800">
                {HISTORY_ACTION_LABELS[item.action]}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                {item.fromStatus && (
                  <>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                      {TICKET_STATUS_LABELS[item.fromStatus]}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  </>
                )}
                <span className="rounded bg-teal-50 px-2 py-0.5 font-medium text-teal-800">
                  {TICKET_STATUS_LABELS[item.toStatus]}
                </span>
              </div>

              {item.note && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  {item.note}
                </div>
              )}

              {item.metadata && (
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  {item.metadata.expectedSku && (
                    <div className="font-mono-code">
                      SKU dự kiến: <strong>{item.metadata.expectedSku}</strong>
                    </div>
                  )}
                  {item.metadata.productUrl && (
                    <div className="flex items-center gap-1 break-all">
                      <span>URL:</span>
                      <a
                        href={item.metadata.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-teal-700 underline"
                      >
                        <span>{item.metadata.productUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    </div>
                  )}
                  {item.metadata.reworkTargetNames && item.metadata.reworkTargetNames.length > 0 && (
                    <div className="text-red-700">
                      Nhân sự được yêu cầu làm lại:{' '}
                      <strong>{item.metadata.reworkTargetNames.join(', ')}</strong>
                    </div>
                  )}
                  {typeof item.metadata.completedCount === 'number' && (
                    <div className="text-blue-700">
                      Tiến độ hoàn thành: {item.metadata.completedCount}/{item.metadata.totalCount}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
