import React, { useEffect, useMemo, useState } from 'react';
import { FileEdit, FolderKanban, Loader2, PackagePlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { validateCreateTicketInput } from '../../domain/ticketStateMachine';
import { createTicket } from '../../services/ticketService';
import {
  TICKET_GROUP_LABELS,
  type CreateTicketInput,
  type TicketAttachmentDraft,
  type TicketGroupType,
} from '../../types/ticket';
import type { UserProfile } from '../../types/user';
import { parseDatetimeLocalVietnam, toDatetimeLocalValue } from '../../utils/dateTime';
import { ErrorSummary } from '../ui/ErrorSummary';
import { ModalOrSheet } from '../ui/ModalOrSheet';
import { UserAvatar } from '../ui/UserAvatar';
import { ImageAttachmentPicker } from './ImageAttachmentPicker';

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  users: UserProfile[];
  onCreated?: (ticketId: string, emailWarning?: string) => void;
}

const GROUP_OPTIONS: Array<{
  type: TicketGroupType;
  label: string;
  desc: string;
  Icon: typeof FileEdit;
}> = [
  {
    type: 'EDIT_OLD',
    label: 'Chỉnh sửa SP cũ',
    desc: 'Kiểm tra & sửa theo SKU',
    Icon: FileEdit,
  },
  {
    type: 'NEW_LISTING',
    label: 'Listing SP mới',
    desc: 'Listing → GoLive → URL',
    Icon: PackagePlus,
  },
  {
    type: 'OFFICE',
    label: 'Công việc VP',
    desc: 'Giao 1 hoặc nhiều nhân sự',
    Icon: FolderKanban,
  },
];

export function CreateTicketModal({ open, onClose, users, onCreated }: CreateTicketModalProps) {
  const { userProfile } = useAuth();
  const pdUsers = useMemo(() => users.filter((u) => u.role === 'PD'), [users]);
  const isOM = userProfile?.role === 'OM';

  const [groupType, setGroupType] = useState<TicketGroupType>(() =>
    userProfile?.role === 'OM' ? 'NEW_LISTING' : 'EDIT_OLD'
  );
  const [title, setTitle] = useState('');
  const [deadlineStr, setDeadlineStr] = useState(() =>
    toDatetimeLocalValue(Date.now() + 24 * 60 * 60 * 1000)
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [reviewerId, setReviewerId] = useState('');
  const [sku, setSku] = useState('');
  const [editRequirements, setEditRequirements] = useState('');
  const [productBasicInfo, setProductBasicInfo] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [expectedSku, setExpectedSku] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [officeRequirements, setOfficeRequirements] = useState('');
  const [attachments, setAttachments] = useState<TicketAttachmentDraft[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open && userProfile) {
      if (userProfile.role === 'OM' && groupType === 'NEW_LISTING' && assigneeIds.length === 0) {
        setAssigneeIds([userProfile.uid]);
      }
      if (!reviewerId) {
        setReviewerId(
          userProfile.role === 'PD' ? userProfile.uid : pdUsers[0]?.uid || ''
        );
      }
    }
  }, [open, userProfile, groupType, pdUsers, assigneeIds.length, reviewerId]);

  const resetForm = () => {
    attachments.forEach((a) => {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    });
    setTitle('');
    setDeadlineStr(toDatetimeLocalValue(Date.now() + 24 * 60 * 60 * 1000));
    setAssigneeIds(userProfile?.role === 'OM' ? [userProfile.uid] : []);
    setReviewerId(userProfile?.role === 'PD' ? userProfile.uid : pdUsers[0]?.uid || '');
    setSku('');
    setEditRequirements('');
    setProductBasicInfo('');
    setAdditionalRequirements('');
    setExpectedSku('');
    setProductUrl('');
    setOfficeRequirements('');
    setAttachments([]);
    setErrors({});
    setServerError('');
    setSubmitAttempt(0);
  };

  const handleGroupChange = (nextGroup: TicketGroupType) => {
    setGroupType(nextGroup);
    setErrors({});
    if (nextGroup === 'NEW_LISTING' && isOM && userProfile) {
      setAssigneeIds([userProfile.uid]);
      if (!reviewerId) setReviewerId(pdUsers[0]?.uid || '');
    } else if (nextGroup !== 'OFFICE' && assigneeIds.length > 1) {
      setAssigneeIds(assigneeIds.slice(0, 1));
    }
  };

  const toggleOfficeAssignee = (uid: string) => {
    setAssigneeIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setServerError('');

    const effectiveReviewerId =
      groupType === 'NEW_LISTING' && isOM ? reviewerId : reviewerId || userProfile.uid;
    const effectiveAssigneeIds =
      groupType === 'NEW_LISTING' && isOM ? [userProfile.uid] : assigneeIds;

    const input: CreateTicketInput = {
      groupType,
      title,
      deadline: parseDatetimeLocalVietnam(deadlineStr),
      assigneeIds: effectiveAssigneeIds,
      reviewerId: effectiveReviewerId,
      sku,
      editRequirements,
      productBasicInfo,
      additionalRequirements,
      expectedSku,
      productUrl,
      officeRequirements,
      attachments,
    };

    const validation = validateCreateTicketInput(input, userProfile.role);
    if (!validation.valid) {
      setErrors(validation.errors);
      setSubmitAttempt((c) => c + 1);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const { ticket, emailResult } = await createTicket(input, userProfile, users);
      resetForm();
      onClose();
      onCreated?.(
        ticket.id,
        emailResult.status === 'FAILED' ? emailResult.errorMessage : undefined
      );
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Không thể tạo ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOmListingMode = isOM && groupType === 'NEW_LISTING';

  return (
    <ModalOrSheet
      open={open}
      onClose={onClose}
      title="Tạo Ticket công việc mới"
      subtitle="Giao việc linh hoạt trong team (PD và OM đều có thể tạo và giao cho nhau)"
      maxWidthClass="md:max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <ErrorSummary errors={errors} triggerCount={submitAttempt} />

        {serverError && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {serverError}
          </div>
        )}

        {/* Group Selector */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Nhóm công việc (*)
          </span>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {GROUP_OPTIONS.map((opt) => {
              const Icon = opt.Icon;
              const active = groupType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleGroupChange(opt.type)}
                  className={`flex min-h-[56px] items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-teal-600 bg-teal-50/70 text-teal-950 ring-1 ring-teal-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-teal-700' : 'text-slate-500'}`}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-slate-500">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {isOmListingMode && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5 text-xs text-teal-900">
            <strong>Luồng OM tạo Listing:</strong> Ticket sẽ <strong>auto-pass bước OM Listing</strong>{' '}
            và gửi thẳng tới <strong>PD được chỉ định</strong> để duyệt GoLive. Chỉ PD đó mới có quyền duyệt.
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="field-title" className="block text-sm font-medium text-slate-800">
            Tiêu đề ({TICKET_GROUP_LABELS[groupType]}) <span className="text-red-600">*</span>
          </label>
          <input
            id="field-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Cập nhật ảnh bìa & mô tả SKU-123"
            className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
            aria-describedby={errors.title ? 'err-title' : undefined}
          />
          {errors.title && (
            <p id="err-title" className="mt-1 text-xs text-red-600">
              {errors.title}
            </p>
          )}
        </div>

        {/* Group I Specific */}
        {groupType === 'EDIT_OLD' && (
          <>
            <div>
              <label htmlFor="field-sku" className="block text-sm font-medium text-slate-800">
                SKU sản phẩm cần kiểm tra <span className="text-red-600">*</span>
              </label>
              <input
                id="field-sku"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="VD: JT-SKU-0045"
                className="font-mono-code mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
                aria-describedby={errors.sku ? 'err-sku' : undefined}
              />
              {errors.sku && (
                <p id="err-sku" className="mt-1 text-xs text-red-600">
                  {errors.sku}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="field-editRequirements"
                className="block text-sm font-medium text-slate-800"
              >
                Yêu cầu chỉnh sửa <span className="text-red-600">*</span>
              </label>
              <textarea
                id="field-editRequirements"
                rows={3}
                value={editRequirements}
                onChange={(e) => setEditRequirements(e.target.value)}
                placeholder="Mô tả chi tiết điểm cần chỉnh sửa trên sản phẩm..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
                aria-describedby={errors.editRequirements ? 'err-editRequirements' : undefined}
              />
              {errors.editRequirements && (
                <p id="err-editRequirements" className="mt-1 text-xs text-red-600">
                  {errors.editRequirements}
                </p>
              )}
            </div>
          </>
        )}

        {/* Group II Specific */}
        {groupType === 'NEW_LISTING' && (
          <>
            <div>
              <label
                htmlFor="field-productBasicInfo"
                className="block text-sm font-medium text-slate-800"
              >
                Thông tin sản phẩm cơ bản <span className="text-red-600">*</span>
              </label>
              <textarea
                id="field-productBasicInfo"
                rows={3}
                value={productBasicInfo}
                onChange={(e) => setProductBasicInfo(e.target.value)}
                placeholder="Tên sản phẩm, phân loại, giá bán, link ảnh/tài liệu..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
                aria-describedby={errors.productBasicInfo ? 'err-productBasicInfo' : undefined}
              />
              {errors.productBasicInfo && (
                <p id="err-productBasicInfo" className="mt-1 text-xs text-red-600">
                  {errors.productBasicInfo}
                </p>
              )}
            </div>

            {isOmListingMode && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="field-expectedSku"
                    className="block text-sm font-medium text-slate-800"
                  >
                    SKU dự kiến <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="field-expectedSku"
                    type="text"
                    value={expectedSku}
                    onChange={(e) => setExpectedSku(e.target.value)}
                    placeholder="VD: JT-NEW-001"
                    className="font-mono-code mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
                  />
                  {errors.expectedSku && (
                    <p className="mt-1 text-xs text-red-600">{errors.expectedSku}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="field-productUrl"
                    className="block text-sm font-medium text-slate-800"
                  >
                    URL sản phẩm <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="field-productUrl"
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
              </div>
            )}

            <div>
              <label
                htmlFor="field-additionalRequirements"
                className="block text-sm font-medium text-slate-800"
              >
                Yêu cầu bổ sung (tùy chọn)
              </label>
              <textarea
                id="field-additionalRequirements"
                rows={2}
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="Ghi chú thêm về SEO, danh mục, voucher..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
              />
            </div>
          </>
        )}

        {/* Group III Specific */}
        {groupType === 'OFFICE' && (
          <div>
            <label
              htmlFor="field-officeRequirements"
              className="block text-sm font-medium text-slate-800"
            >
              Yêu cầu công việc <span className="text-red-600">*</span>
            </label>
            <textarea
              id="field-officeRequirements"
              rows={3}
              value={officeRequirements}
              onChange={(e) => setOfficeRequirements(e.target.value)}
              placeholder="Mô tả nội dung công việc cần các nhân sự hoàn thành..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
              aria-describedby={errors.officeRequirements ? 'err-officeRequirements' : undefined}
            />
            {errors.officeRequirements && (
              <p id="err-officeRequirements" className="mt-1 text-xs text-red-600">
                {errors.officeRequirements}
              </p>
            )}
          </div>
        )}

        {/* Shared File Attachments */}
        <ImageAttachmentPicker attachments={attachments} onChange={setAttachments} />

        {/* Deadline */}
        <div>
          <label htmlFor="field-deadline" className="block text-sm font-medium text-slate-800">
            Deadline (Giờ Việt Nam UTC+7) <span className="text-red-600">*</span>
          </label>
          <input
            id="field-deadline"
            type="datetime-local"
            value={deadlineStr}
            onChange={(e) => setDeadlineStr(e.target.value)}
            className="font-mono-code mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
            aria-describedby={errors.deadline ? 'err-deadline' : undefined}
          />
          {errors.deadline && (
            <p id="err-deadline" className="mt-1 text-xs text-red-600">
              {errors.deadline}
            </p>
          )}
        </div>

        {/* Reviewer selector (Required for OM-created NEW_LISTING; optional/defaults to creator otherwise) */}
        {isOmListingMode && (
          <div>
            <label htmlFor="field-reviewerId" className="block text-sm font-medium text-slate-800">
              Gán cho PD duyệt đơn này <span className="text-red-600">*</span>
            </label>
            <select
              id="field-reviewerId"
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
            >
              <option value="">-- Chọn PD duyệt --</option>
              {pdUsers.map((pd) => (
                <option key={pd.uid} value={pd.uid}>
                  {pd.displayName} (PD · {pd.email})
                </option>
              ))}
            </select>
            {errors.reviewerId && (
              <p id="err-reviewerId" className="mt-1 text-xs text-red-600">
                {errors.reviewerId}
              </p>
            )}
          </div>
        )}

        {/* Assignees (Any member: PD or OM; hidden when OM creates NEW_LISTING as OM is always the GoLive executor) */}
        {!isOmListingMode && (
          <div>
            <label htmlFor="field-assigneeIds" className="block text-sm font-medium text-slate-800">
              {groupType === 'OFFICE'
                ? 'Các nhân sự được giao (chọn 1 hoặc nhiều)'
                : 'Nhân sự được giao thực hiện (chọn 1)'}{' '}
              <span className="text-red-600">*</span>
            </label>

            {users.length === 0 ? (
              <div className="mt-1.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                Chưa có thành viên nào trong hệ thống.
              </div>
            ) : groupType === 'OFFICE' ? (
              <div
                id="field-assigneeIds"
                tabIndex={-1}
                className="mt-1.5 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50 p-2"
              >
                {users.map((member) => {
                  const checked = assigneeIds.includes(member.uid);
                  return (
                    <label
                      key={member.uid}
                      className={`flex min-h-[44px] items-center gap-3 rounded-lg border px-3 py-2 transition ${
                        checked
                          ? 'border-teal-500 bg-white'
                          : 'border-transparent bg-white/60 hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOfficeAssignee(member.uid)}
                        className="h-4 w-4 accent-teal-600"
                      />
                      <UserAvatar
                        name={member.displayName}
                        avatarDataUrl={member.avatarDataUrl}
                        size="xs"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {member.displayName}{' '}
                          <span className="text-xs font-semibold text-teal-700">({member.role})</span>
                        </div>
                        <div className="truncate text-xs text-slate-500">{member.email}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <select
                id="field-assigneeIds"
                value={assigneeIds[0] || ''}
                onChange={(e) => setAssigneeIds(e.target.value ? [e.target.value] : [])}
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 md:text-sm"
              >
                <option value="">-- Chọn nhân sự được giao --</option>
                {users.map((member) => (
                  <option key={member.uid} value={member.uid}>
                    {member.displayName} ({member.role} · {member.email})
                  </option>
                ))}
              </select>
            )}
            {errors.assigneeIds && (
              <p id="err-assigneeIds" className="mt-1 text-xs text-red-600">
                {errors.assigneeIds}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting || users.length === 0}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{submitting ? 'Đang tạo & gửi thông báo...' : 'Tạo Ticket & Gửi thông báo'}</span>
          </button>
        </div>
      </form>
    </ModalOrSheet>
  );
}
