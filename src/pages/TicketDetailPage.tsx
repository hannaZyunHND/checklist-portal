import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Mail,
  Paperclip,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { canDeleteTicket, getTicketReviewerId } from '../domain/ticketStateMachine';
import { isTicketOverdue } from '../domain/ticketStats';
import { dispatchTicketEmail, subscribeTicketEmailLogs } from '../services/emailService';
import {
  formatFileSize,
  isImageAttachment,
  resolveAttachmentViewUrl,
} from '../services/r2Service';
import {
  deleteTicket,
  subscribeTicketAttachments,
  subscribeTicketDetail,
  subscribeTicketHistory,
} from '../services/ticketService';
import {
  TICKET_GROUP_LABELS,
  type EmailLogEntry,
  type Ticket,
  type TicketAttachment,
  type TicketHistoryEntry,
} from '../types/ticket';
import { formatOverdueDuration, formatVietnamDateTime } from '../utils/dateTime';
import { DeleteTicketModal } from '../components/tickets/DeleteTicketModal';
import { ImageLightbox, type LightboxImageItem } from '../components/tickets/ImageLightbox';
import { TicketActionPanel } from '../components/tickets/TicketActionPanel';
import { TicketHistoryTimeline } from '../components/tickets/TicketHistoryTimeline';
import { TicketStepper } from '../components/tickets/TicketStepper';
import { OverdueBadge, TicketGroupBadge, TicketStatusBadge } from '../components/ui/StatusBadge';
import { UserAvatar } from '../components/ui/UserAvatar';

export function TicketDetailPage({ nowMs }: { nowMs: number }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; warning?: string } | null>(null);
  const [retryingEmail, setRetryingEmail] = useState(false);

  useEffect(() => {
    if (attachments.length === 0) {
      setResolvedUrls({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        attachments.map(async (att) => [att.id, await resolveAttachmentViewUrl(att)] as const)
      );
      if (!cancelled) {
        setResolvedUrls(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attachments]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsubTicket = subscribeTicketDetail(
      id,
      (doc) => {
        setTicket(doc);
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      }
    );
    const unsubHistory = subscribeTicketHistory(id, setHistory);
    const unsubAttachments = subscribeTicketAttachments(id, setAttachments);
    const unsubEmail = subscribeTicketEmailLogs(id, setEmailLogs);

    return () => {
      unsubTicket();
      unsubHistory();
      unsubAttachments();
      unsubEmail();
    };
  }, [id, userProfile?.role]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Đang tải thông tin ticket...
      </div>
    );
  }

  if (error || !ticket || !userProfile) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-red-700">
          {error || 'Không tìm thấy ticket hoặc bạn không có quyền xem ticket này.'}
        </p>
        <Link
          to="/tickets"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Quay lại danh sách</span>
        </Link>
      </div>
    );
  }

  const overdue = isTicketOverdue(ticket, nowMs);
  const latestEmail = emailLogs[0];

  const handleRetryEmail = async (log: EmailLogEntry) => {
    setRetryingEmail(true);
    try {
      const res = await dispatchTicketEmail({
        ticket,
        eventType: log.eventType,
        recipients: log.recipients,
        actorName: `${userProfile.displayName} (${userProfile.role})`,
        expectedSku: ticket.expectedSku || undefined,
        productUrl: ticket.productUrl || undefined,
      });
      setFeedback({
        msg:
          res.status === 'SENT'
            ? 'Đã gửi lại email thông báo thành công.'
            : 'Gửi lại email vẫn thất bại.',
        warning: res.status === 'FAILED' ? res.errorMessage : undefined,
      });
    } finally {
      setRetryingEmail(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/tickets"
          className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Quay lại danh sách công việc</span>
        </Link>

        {canDeleteTicket(ticket, userProfile) && (
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Xóa Ticket</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border p-3.5 text-sm ${
            feedback.warning
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-emerald-300 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{feedback.msg}</span>
          </div>
          {feedback.warning && (
            <p className="mt-1 text-xs">
              Lưu ý gửi email: {feedback.warning} (Trạng thái ticket đã được lưu an toàn).
            </p>
          )}
        </div>
      )}

      {/* Header Card */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono-code rounded-md bg-teal-50 px-2.5 py-1 text-sm font-bold text-teal-800">
              {ticket.code}
            </span>
            <TicketGroupBadge groupType={ticket.groupType} />
            {overdue && <OverdueBadge />}
          </div>
          <TicketStatusBadge status={ticket.status} />
        </div>

        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{ticket.title}</h1>

        {overdue && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-amber-400 bg-amber-100 px-4 py-3 text-sm text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div>
              <div className="font-semibold">
                Cảnh báo Overdue: {formatOverdueDuration(ticket.deadline, nowMs)}
              </div>
              <div className="text-xs text-amber-900">
                Deadline đã đặt: {formatVietnamDateTime(ticket.deadline)} (UTC+7)
              </div>
            </div>
          </div>
        )}

        <TicketStepper ticket={ticket} />

        <div
          className={`grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 ${
            ticket.groupType === 'EDIT_OLD' ? 'lg:grid-cols-4' : 'lg:grid-cols-5'
          }`}
        >
          <div>
            <div className="text-xs text-slate-500">Nhóm nghiệp vụ</div>
            <div className="mt-0.5 font-medium text-slate-900">
              {TICKET_GROUP_LABELS[ticket.groupType]}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Người khởi tạo request</div>
            <div className="mt-0.5 font-medium text-slate-900">{ticket.createdByName}</div>
            <div className="text-xs text-slate-500">{ticket.createdByEmail}</div>
          </div>
          {ticket.groupType !== 'EDIT_OLD' && (
            <div>
              <div className="text-xs text-slate-500">
                {ticket.groupType === 'NEW_LISTING' ? 'Vai trò PD (Kiểm tra/Duyệt)' : 'Người kiểm tra & đóng'}
              </div>
              <div className="mt-0.5 font-medium text-slate-900">
                {ticket.reviewerName || ticket.createdByName}
              </div>
              <div className="text-xs text-slate-500">
                {ticket.reviewerEmail || ticket.createdByEmail}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-slate-500">Thời gian tạo</div>
            <div className="font-mono-code mt-0.5 flex items-center gap-1.5 font-medium text-slate-800">
              <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>{formatVietnamDateTime(ticket.createdAt)}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Deadline</div>
            <div className="font-mono-code mt-0.5 flex items-center gap-1.5 font-semibold text-slate-900">
              <CalendarClock className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>{formatVietnamDateTime(ticket.deadline)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: Details + Actions (Left) | Audit Timeline (Right) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Business Content Card */}
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
            <h2 className="text-base font-semibold text-slate-900">Thông tin chi tiết yêu cầu</h2>

            {ticket.groupType === 'EDIT_OLD' && (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-medium text-slate-500">SKU sản phẩm cần kiểm tra</div>
                  <div className="font-mono-code mt-1 inline-block rounded-md bg-slate-100 px-2.5 py-1 font-semibold text-slate-900">
                    {ticket.sku}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Yêu cầu chỉnh sửa</div>
                  <div className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800">
                    {ticket.editRequirements}
                  </div>
                </div>
              </div>
            )}

            {ticket.groupType === 'NEW_LISTING' && (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-medium text-slate-500">Thông tin sản phẩm cơ bản</div>
                  <div className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800">
                    {ticket.productBasicInfo}
                  </div>
                </div>
                {ticket.additionalRequirements && (
                  <div>
                    <div className="text-xs font-medium text-slate-500">Yêu cầu bổ sung</div>
                    <div className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800">
                      {ticket.additionalRequirements}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-medium text-slate-500">SKU dự kiến</div>
                    <div className="font-mono-code mt-1 font-semibold text-slate-900">
                      {ticket.expectedSku || 'Chưa cập nhật'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-medium text-slate-500">URL sản phẩm (GoLive)</div>
                    {ticket.productUrl ? (
                      <a
                        href={ticket.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 break-all font-medium text-teal-700 underline"
                      >
                        <span>{ticket.productUrl}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    ) : (
                      <div className="mt-1 text-slate-500">Chưa có</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {ticket.groupType === 'OFFICE' && (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-medium text-slate-500">Yêu cầu công việc</div>
                  <div className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800">
                    {ticket.officeRequirements}
                  </div>
                </div>
              </div>
            )}

            {attachments.length > 0 && (() => {
              const imageAtts = attachments.filter((att) =>
                isImageAttachment(att.mimeType || '', att.name)
              );
              const docAtts = attachments.filter(
                (att) => !isImageAttachment(att.mimeType || '', att.name)
              );
              return (
                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tệp đính kèm ({attachments.length})</span>
                  </div>

                  {imageAtts.length > 0 && (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {imageAtts.map((att, idx) => {
                        const src = resolvedUrls[att.id] || att.dataUrl || att.url || '';
                        return (
                          <button
                            key={att.id}
                            type="button"
                            onClick={() => setLightboxIndex(idx)}
                            className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left transition hover:border-teal-500"
                          >
                            {src ? (
                              <img
                                src={src}
                                alt={att.name}
                                className="h-28 w-full object-cover transition group-hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="flex h-28 items-center justify-center text-xs text-slate-400">
                                Đang tải ảnh...
                              </div>
                            )}
                            <div className="truncate px-2 py-1.5 text-[11px] font-medium text-slate-700">
                              {att.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {docAtts.length > 0 && (
                    <div className="space-y-2">
                      {docAtts.map((att) => {
                        const href = resolvedUrls[att.id] || att.url || '';
                        const lower = att.name.toLowerCase();
                        const isExcel =
                          lower.endsWith('.xls') ||
                          lower.endsWith('.xlsx') ||
                          lower.endsWith('.csv');
                        const Icon = isExcel ? FileSpreadsheet : FileText;
                        return (
                          <div
                            key={att.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Icon
                                className={`h-5 w-5 shrink-0 ${
                                  isExcel ? 'text-emerald-700' : 'text-blue-700'
                                }`}
                                aria-hidden="true"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-slate-900">
                                  {att.name}
                                </div>
                                <div className="font-mono-code text-[11px] text-slate-500">
                                  {formatFileSize(att.sizeBytes)}
                                </div>
                              </div>
                            </div>
                            {href && (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={att.name}
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Tải / Xem</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs font-medium text-slate-500">
                {ticket.groupType === 'OFFICE'
                  ? 'Nhân sự được giao thực hiện'
                  : 'Vai trò OM (Người thực hiện)'}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {ticket.assigneeIds.map((uid) => {
                  const snap = ticket.assigneeSnapshots[uid];
                  return (
                    <div
                      key={uid}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pr-3 pl-1.5"
                    >
                      <UserAvatar
                        name={snap?.displayName || uid}
                        avatarDataUrl={snap?.avatarDataUrl}
                        size="xs"
                      />
                      <span className="text-xs font-medium text-slate-800">
                        {snap?.displayName || uid}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Role/Step Action Panel */}
          <TicketActionPanel
            ticket={ticket}
            currentUser={userProfile}
            onActionSuccess={(msg, warning) => setFeedback({ msg, warning })}
          />

          {/* Creator / Reviewer: Latest Email Notification Delivery Status */}
          {(userProfile.uid === ticket.createdBy ||
            userProfile.uid === getTicketReviewerId(ticket)) &&
            latestEmail && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 text-slate-500" aria-hidden="true" />
                <div>
                  <div className="font-semibold text-slate-800">
                    Email thông báo gần nhất ({latestEmail.eventType}):{' '}
                    <span
                      className={
                        latestEmail.status === 'SENT' ? 'text-emerald-700' : 'text-red-700'
                      }
                    >
                      {latestEmail.status === 'SENT' ? 'Đã gửi' : 'Thất bại'}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    Người nhận: {latestEmail.recipients.join(', ')} ·{' '}
                    {formatVietnamDateTime(latestEmail.createdAt)}
                  </div>
                  {latestEmail.errorMessage && (
                    <div className="mt-0.5 text-red-700">Lý do: {latestEmail.errorMessage}</div>
                  )}
                </div>
              </div>
              {latestEmail.status === 'FAILED' && (
                <button
                  type="button"
                  disabled={retryingEmail}
                  onClick={() => handleRetryEmail(latestEmail)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${retryingEmail ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>Gửi lại email</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* History Column */}
        <div className="lg:col-span-1">
          <TicketHistoryTimeline entries={history} />
        </div>
      </div>

      <ImageLightbox
        images={attachments
          .filter((att) => isImageAttachment(att.mimeType || '', att.name))
          .map(
            (att): LightboxImageItem => ({
              id: att.id,
              name: att.name,
              src: resolvedUrls[att.id] || att.dataUrl || att.url || '',
            })
          )}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />

      <DeleteTicketModal
        ticket={deleteModalOpen ? ticket : null}
        onClose={() => setDeleteModalOpen(false)}
        onConfirmDelete={async (target) => {
          await deleteTicket(target.id, userProfile);
          navigate('/tickets');
        }}
      />
    </div>
  );
}
