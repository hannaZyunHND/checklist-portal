import { useState } from 'react';
import { CheckCircle2, Clock, Loader2, Rocket, RotateCcw } from 'lucide-react';
import { getAvailableActions, validateTransition } from '../../domain/ticketStateMachine';
import { performTicketTransition } from '../../services/ticketService';
import type { Ticket, TicketAction } from '../../types/ticket';
import type { UserProfile } from '../../types/user';
import { formatVietnamDateTime } from '../../utils/dateTime';
import { UserAvatar } from '../ui/UserAvatar';

interface TicketActionPanelProps {
  ticket: Ticket;
  currentUser: UserProfile;
  onActionSuccess?: (msg: string, emailWarning?: string) => void;
}

export function TicketActionPanel({
  ticket,
  currentUser,
  onActionSuccess,
}: TicketActionPanelProps) {
  const actions = getAvailableActions(ticket, currentUser);
  const [note, setNote] = useState('');
  const [expectedSku, setExpectedSku] = useState(ticket.expectedSku || '');
  const [productUrl, setProductUrl] = useState(ticket.productUrl || '');
  const [reworkMode, setReworkMode] = useState(false);
  const [reworkTargets, setReworkTargets] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const runAction = async (action: TicketAction) => {
    const payload = {
      note,
      expectedSku,
      productUrl,
      reworkTargetUids: ticket.groupType === 'OFFICE' ? reworkTargets : undefined,
    };

    const validation = validateTransition(ticket, currentUser, action, payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const { emailResult } = await performTicketTransition({
        ticketId: ticket.id,
        actor: currentUser,
        action,
        payload,
      });
      setNote('');
      setReworkMode(false);
      setReworkTargets([]);
      onActionSuccess?.(
        'Đã cập nhật trạng thái ticket và lưu lịch sử.',
        emailResult?.status === 'FAILED' ? emailResult.errorMessage : undefined
      );
    } catch (err) {
      setErrors({
        action: err instanceof Error ? err.message : 'Không thể cập nhật ticket.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTarget = (uid: string) => {
    setReworkTargets((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <h2 className="text-base font-semibold text-slate-900">Xử lý công việc & Trạng thái</h2>

      {/* Group III Progress Checklist */}
      {ticket.groupType === 'OFFICE' && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Tiến độ từng nhân sự được giao
          </div>
          <div className="space-y-2">
            {ticket.assigneeIds.map((uid) => {
              const snap = ticket.assigneeSnapshots[uid];
              const state = ticket.assigneeStates?.[uid];
              const isDone = Boolean(state?.completed);
              return (
                <div
                  key={uid}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <UserAvatar
                      name={snap?.displayName || uid}
                      avatarDataUrl={snap?.avatarDataUrl}
                      size="sm"
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {snap?.displayName || uid}
                      </div>
                      <div className="text-xs text-slate-500">{snap?.email}</div>
                    </div>
                  </div>
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        Đã xong{' '}
                        {state?.completedAt ? `(${formatVietnamDateTime(state.completedAt)})` : ''}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Chưa hoàn thành</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {errors.action && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {errors.action}
        </div>
      )}

      {actions.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-600">
          {ticket.status === 'CLOSED'
            ? 'Ticket này đã được đóng hoàn tất.'
            : ticket.groupType === 'OFFICE' &&
              currentUser.role === 'OM' &&
              ticket.assigneeStates?.[currentUser.uid]?.completed
            ? 'Bạn đã tích hoàn thành phần việc của mình. Hệ thống đang chờ các nhân sự còn lại hoàn tất để báo PD.'
            : 'Hiện tại bạn không có thao tác xử lý ở bước này (đang chờ bên còn lại phản hồi).'}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Group II: OM Listing requires expectedSku */}
          {actions.includes('OM_SUBMIT_LISTING') && (
            <div>
              <label htmlFor="input-expectedSku" className="block text-sm font-medium text-slate-800">
                SKU dự kiến của sản phẩm <span className="text-red-600">*</span>
              </label>
              <input
                id="input-expectedSku"
                type="text"
                value={expectedSku}
                onChange={(e) => setExpectedSku(e.target.value)}
                placeholder="Nhập SKU dự kiến..."
                className="font-mono-code mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
              />
              {errors.expectedSku && (
                <p className="mt-1 text-xs text-red-600">{errors.expectedSku}</p>
              )}
            </div>
          )}

          {/* Group II: OM GoLive requires productUrl */}
          {actions.includes('OM_SUBMIT_GOLIVE') && (
            <div>
              <label htmlFor="input-productUrl" className="block text-sm font-medium text-slate-800">
                URL sản phẩm sau khi GoLive <span className="text-red-600">*</span>
              </label>
              <input
                id="input-productUrl"
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
              />
              {errors.productUrl && (
                <p className="mt-1 text-xs text-red-600">{errors.productUrl}</p>
              )}
            </div>
          )}

          {/* Group III Targeted Rework Checkboxes */}
          {reworkMode && ticket.groupType === 'OFFICE' && (
            <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/50 p-3">
              <div className="text-sm font-semibold text-red-900">
                Chọn đích danh nhân sự cần làm lại <span className="text-red-600">*</span>
              </div>
              <div className="space-y-1.5">
                {ticket.assigneeIds.map((uid) => {
                  const snap = ticket.assigneeSnapshots[uid];
                  const checked = reworkTargets.includes(uid);
                  return (
                    <label
                      key={uid}
                      className="flex min-h-[44px] items-center gap-2.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTarget(uid)}
                        className="h-4 w-4 accent-red-600"
                      />
                      <span className="font-medium text-slate-900">
                        {snap?.displayName || uid}
                      </span>
                      <span className="text-xs text-slate-500">({snap?.email})</span>
                    </label>
                  );
                })}
              </div>
              {errors.reworkTargetUids && (
                <p className="text-xs text-red-600">{errors.reworkTargetUids}</p>
              )}
            </div>
          )}

          {/* Note / Rework Reason */}
          <div>
            <label htmlFor="input-note" className="block text-sm font-medium text-slate-800">
              {reworkMode ? (
                <>
                  Lý do yêu cầu làm lại <span className="text-red-600">*</span>
                </>
              ) : (
                'Ghi chú thực hiện (tùy chọn)'
              )}
            </label>
            <textarea
              id="input-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                reworkMode
                  ? 'Mô tả rõ điểm chưa đạt để nhân sự OM chỉnh sửa...'
                  : 'Nhập ghi chú đính kèm nếu có...'
              }
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
            />
            {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            {actions.includes('OM_COMPLETE') && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => runAction('OM_COMPLETE')}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span>
                  {ticket.groupType === 'OFFICE'
                    ? 'Tích hoàn thành phần của tôi'
                    : 'Tích hoàn thành'}
                </span>
              </button>
            )}

            {actions.includes('OM_SUBMIT_LISTING') && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => runAction('OM_SUBMIT_LISTING')}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Hoàn thành Listing & Gửi PD</span>
              </button>
            )}

            {actions.includes('OM_SUBMIT_GOLIVE') && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => runAction('OM_SUBMIT_GOLIVE')}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Rocket className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Gửi URL hoàn tất GoLive</span>
              </button>
            )}

            {actions.includes('PD_APPROVE_GOLIVE') && !reworkMode && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => runAction('PD_APPROVE_GOLIVE')}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Rocket className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Xác nhận &quot;Golive sản phẩm&quot;</span>
              </button>
            )}

            {actions.includes('PD_CLOSE') && !reworkMode && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => runAction('PD_CLOSE')}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Xác nhận Đạt & Đóng ticket</span>
              </button>
            )}

            {actions.includes('PD_REJECT_REWORK') && !reworkMode && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setReworkMode(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>
                  {ticket.groupType === 'NEW_LISTING' && ticket.status === 'PENDING_CLOSE'
                    ? 'Không đạt (Quay lại GoLive)'
                    : 'Yêu cầu làm lại'}
                </span>
              </button>
            )}

            {reworkMode && (
              <>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => runAction('PD_REJECT_REWORK')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  <span>Xác nhận trả về làm lại</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setReworkMode(false);
                    setErrors({});
                  }}
                  className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
