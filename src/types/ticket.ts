import type { UserRole, UserSnapshot } from './user';

export type TicketGroupType = 'EDIT_OLD' | 'NEW_LISTING' | 'OFFICE';

export type TicketStatus =
  | 'WAITING_OM'
  | 'PENDING_PD_CHECK'
  | 'WAITING_LISTING'
  | 'PENDING_GOLIVE_APPROVAL'
  | 'WAITING_GOLIVE'
  | 'PENDING_CLOSE'
  | 'CLOSED';

export type TicketAction =
  | 'OM_COMPLETE'
  | 'OM_CLOSE_EDIT_GOLIVE'
  | 'OM_SUBMIT_LISTING'
  | 'PD_APPROVE_GOLIVE'
  | 'OM_SUBMIT_GOLIVE'
  | 'PD_REJECT_REWORK'
  | 'PD_CLOSE';

export type HistoryAction =
  | 'CREATE'
  | 'OM_COMPLETE'
  | 'OM_CLOSE_EDIT_GOLIVE'
  | 'OM_CHECK_PARTIAL'
  | 'OM_SUBMIT_LISTING'
  | 'PD_APPROVE_GOLIVE'
  | 'OM_SUBMIT_GOLIVE'
  | 'PD_REJECT_REWORK'
  | 'PD_CLOSE';

export type EmailEventType =
  | 'TICKET_CREATED'
  | 'OM_COMPLETED'
  | 'GOLIVE_APPROVED'
  | 'GOLIVE_SUBMITTED'
  | 'REWORK_REQUESTED';

export interface AssigneeProgressState {
  completed: boolean;
  completedAt: number | null;
  note?: string;
  reworkRequestedAt?: number | null;
}

export interface TicketAttachmentDraft {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  file?: File;
  previewUrl?: string;
  dataUrl?: string;
}

export interface TicketAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storageType?: 'r2' | 'inline';
  r2Key?: string;
  url?: string;
  dataUrl?: string;
  createdAt: number;
}

export interface Ticket {
  id: string;
  code: string;
  groupType: TicketGroupType;
  title: string;
  status: TicketStatus;
  deadline: number;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  reviewerId?: string | null;
  reviewerName?: string | null;
  reviewerEmail?: string | null;
  listingAssigneeId?: string | null;
  listingAssigneeName?: string | null;
  listingAssigneeEmail?: string | null;
  goliveAssigneeId?: string | null;
  goliveAssigneeName?: string | null;
  goliveAssigneeEmail?: string | null;
  assigneeIds: string[];
  assigneeSnapshots: Record<string, UserSnapshot>;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
  attachmentCount?: number;
  // Group I
  sku?: string;
  editRequirements?: string;
  // Group II
  productBasicInfo?: string;
  additionalRequirements?: string;
  expectedSku?: string | null;
  productUrl?: string | null;
  // Group III
  officeRequirements?: string;
  assigneeStates?: Record<string, AssigneeProgressState>;
}

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | 'PD' | 'OM';
  action: HistoryAction;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  note?: string;
  metadata?: {
    expectedSku?: string;
    productUrl?: string;
    reworkTargetUids?: string[];
    reworkTargetNames?: string[];
    completedCount?: number;
    totalCount?: number;
  };
  createdAt: number;
}

export interface EmailLogEntry {
  id: string;
  ticketId: string;
  ticketCode: string;
  eventType: EmailEventType;
  recipients: string[];
  status: 'SENT' | 'FAILED';
  errorMessage?: string | null;
  createdAt: number;
}

export interface CreateTicketInput {
  groupType: TicketGroupType;
  title: string;
  deadline: number;
  assigneeIds: string[];
  reviewerId?: string;
  listingAssigneeId?: string;
  goliveAssigneeId?: string;
  autoPassListing?: boolean;
  sku?: string;
  editRequirements?: string;
  productBasicInfo?: string;
  additionalRequirements?: string;
  expectedSku?: string;
  productUrl?: string;
  officeRequirements?: string;
  attachments?: TicketAttachmentDraft[];
}

export interface TransitionPayload {
  note?: string;
  expectedSku?: string;
  productUrl?: string;
  reworkTargetUids?: string[];
}

export const TICKET_GROUP_LABELS: Record<TicketGroupType, string> = {
  EDIT_OLD: 'Chỉnh sửa sản phẩm cũ',
  NEW_LISTING: 'Listing sản phẩm mới',
  OFFICE: 'Công việc văn phòng',
};

export const TICKET_GROUP_SHORT_LABELS: Record<TicketGroupType, string> = {
  EDIT_OLD: 'Chỉnh sửa SP cũ',
  NEW_LISTING: 'Listing SP mới',
  OFFICE: 'Công việc VP',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  WAITING_OM: 'Chờ thực hiện',
  PENDING_PD_CHECK: 'Chờ kiểm tra',
  WAITING_LISTING: 'Chờ Listing',
  PENDING_GOLIVE_APPROVAL: 'Chờ duyệt Listing',
  WAITING_GOLIVE: 'Chờ GoLive',
  PENDING_CLOSE: 'Chờ kiểm tra đóng',
  CLOSED: 'Đã đóng',
};

export const HISTORY_ACTION_LABELS: Record<HistoryAction, string> = {
  CREATE: 'Tạo ticket mới',
  OM_COMPLETE: 'Hoàn thành bước thực hiện',
  OM_CLOSE_EDIT_GOLIVE: 'Hoàn tất GoLive & Đóng Task',
  OM_CHECK_PARTIAL: 'Hoàn thành phần việc cá nhân',
  OM_SUBMIT_LISTING: 'Hoàn thành Listing & gửi kiểm tra',
  PD_APPROVE_GOLIVE: 'Duyệt Listing → Chuyển GoLive',
  OM_SUBMIT_GOLIVE: 'Hoàn tất GoLive & Đóng Task',
  PD_REJECT_REWORK: 'Yêu cầu làm lại',
  PD_CLOSE: 'Kiểm tra đạt & Đóng Task',
};
