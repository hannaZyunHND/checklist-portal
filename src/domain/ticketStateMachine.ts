import type {
  AssigneeProgressState,
  CreateTicketInput,
  EmailEventType,
  HistoryAction,
  Ticket,
  TicketAction,
  TicketStatus,
  TransitionPayload,
} from '../types/ticket';
import type { UserProfile } from '../types/user';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface EmailDispatchPlan {
  eventType: EmailEventType;
  recipients: string[];
  note?: string;
  expectedSku?: string;
  productUrl?: string;
}

export interface TransitionResult {
  nextStatus: TicketStatus;
  ticketPatch: Partial<Ticket>;
  historyAction: HistoryAction;
  historyNote?: string;
  historyMetadata?: {
    expectedSku?: string;
    productUrl?: string;
    reworkTargetUids?: string[];
    reworkTargetNames?: string[];
    completedCount?: number;
    totalCount?: number;
  };
  emailPlan: EmailDispatchPlan | null;
}

export function getInitialStatusForGroup(groupType: CreateTicketInput['groupType']): TicketStatus {
  switch (groupType) {
    case 'EDIT_OLD':
      return 'WAITING_OM';
    case 'NEW_LISTING':
      return 'WAITING_LISTING';
    case 'OFFICE':
      return 'WAITING_OM';
  }
}

export function getGroupPrefix(groupType: CreateTicketInput['groupType']): string {
  switch (groupType) {
    case 'EDIT_OLD':
      return 'CS';
    case 'NEW_LISTING':
      return 'LS';
    case 'OFFICE':
      return 'VP';
  }
}

export function validateCreateTicketInput(input: CreateTicketInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.title.trim()) {
    errors.title = 'Vui lòng nhập tiêu đề ticket.';
  }
  if (!input.deadline || Number.isNaN(input.deadline)) {
    errors.deadline = 'Vui lòng chọn Deadline hợp lệ.';
  }
  if (!input.assigneeIds || input.assigneeIds.length === 0) {
    errors.assigneeIds = 'Vui lòng chọn ít nhất 1 nhân sự thực hiện (OM).';
  } else if (
    (input.groupType === 'EDIT_OLD' || input.groupType === 'NEW_LISTING') &&
    input.assigneeIds.length !== 1
  ) {
    errors.assigneeIds = 'Nhóm việc này chỉ giao cho đúng 1 nhân sự OM.';
  }

  if (input.groupType === 'EDIT_OLD') {
    if (!input.sku?.trim()) {
      errors.sku = 'Vui lòng nhập SKU sản phẩm cần kiểm tra.';
    }
    if (!input.editRequirements?.trim()) {
      errors.editRequirements = 'Vui lòng nhập yêu cầu chỉnh sửa.';
    }
  } else if (input.groupType === 'NEW_LISTING') {
    if (!input.productBasicInfo?.trim()) {
      errors.productBasicInfo = 'Vui lòng nhập thông tin sản phẩm cơ bản.';
    }
  } else if (input.groupType === 'OFFICE') {
    if (!input.officeRequirements?.trim()) {
      errors.officeRequirements = 'Vui lòng nhập yêu cầu công việc.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function isValidHttpUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getAvailableActions(ticket: Ticket, user: UserProfile): TicketAction[] {
  if (ticket.status === 'CLOSED') {
    return [];
  }

  const isAssignedOM = user.role === 'OM' && ticket.assigneeIds.includes(user.uid);
  const isPD = user.role === 'PD';

  if (ticket.groupType === 'EDIT_OLD') {
    if (ticket.status === 'WAITING_OM' && isAssignedOM) {
      return ['OM_COMPLETE'];
    }
    if (ticket.status === 'PENDING_PD_CHECK' && isPD) {
      return ['PD_CLOSE', 'PD_REJECT_REWORK'];
    }
    return [];
  }

  if (ticket.groupType === 'NEW_LISTING') {
    if (ticket.status === 'WAITING_LISTING' && isAssignedOM) {
      return ['OM_SUBMIT_LISTING'];
    }
    if (ticket.status === 'PENDING_GOLIVE_APPROVAL' && isPD) {
      return ['PD_APPROVE_GOLIVE', 'PD_REJECT_REWORK'];
    }
    if (ticket.status === 'WAITING_GOLIVE' && isAssignedOM) {
      return ['OM_SUBMIT_GOLIVE'];
    }
    if (ticket.status === 'PENDING_CLOSE' && isPD) {
      return ['PD_CLOSE', 'PD_REJECT_REWORK'];
    }
    return [];
  }

  // OFFICE (Group III)
  if (ticket.status === 'WAITING_OM' && isAssignedOM) {
    const alreadyDone = Boolean(ticket.assigneeStates?.[user.uid]?.completed);
    return alreadyDone ? [] : ['OM_COMPLETE'];
  }
  if (ticket.status === 'PENDING_PD_CHECK' && isPD) {
    return ['PD_CLOSE', 'PD_REJECT_REWORK'];
  }
  return [];
}

export function validateTransition(
  ticket: Ticket,
  actor: UserProfile,
  action: TicketAction,
  payload: TransitionPayload = {}
): ValidationResult {
  const errors: Record<string, string> = {};
  const allowed = getAvailableActions(ticket, actor);

  if (!allowed.includes(action)) {
    errors.action = 'Bạn không có quyền hoặc trạng thái hiện tại không cho phép thao tác này.';
    return { valid: false, errors };
  }

  if (action === 'OM_SUBMIT_LISTING') {
    if (!payload.expectedSku?.trim()) {
      errors.expectedSku = 'Vui lòng nhập SKU dự kiến của sản phẩm.';
    }
  }

  if (action === 'OM_SUBMIT_GOLIVE') {
    if (!payload.productUrl?.trim()) {
      errors.productUrl = 'Vui lòng nhập URL sản phẩm sau khi GoLive.';
    } else if (!isValidHttpUrl(payload.productUrl)) {
      errors.productUrl = 'URL sản phẩm phải bắt đầu bằng http:// hoặc https://.';
    }
  }

  if (action === 'PD_REJECT_REWORK') {
    if (!payload.note?.trim()) {
      errors.note = 'Vui lòng nhập lý do yêu cầu làm lại.';
    }
    if (ticket.groupType === 'OFFICE') {
      const targets = payload.reworkTargetUids || [];
      if (targets.length === 0) {
        errors.reworkTargetUids = 'Vui lòng chọn ít nhất 1 nhân sự cần làm lại.';
      } else if (targets.some((uid) => !ticket.assigneeIds.includes(uid))) {
        errors.reworkTargetUids = 'Danh sách nhân sự làm lại không hợp lệ.';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function computeTransitionResult(
  ticket: Ticket,
  actor: UserProfile,
  action: TicketAction,
  payload: TransitionPayload = {},
  nowMs = Date.now()
): TransitionResult {
  const validation = validateTransition(ticket, actor, action, payload);
  if (!validation.valid) {
    const firstError = Object.values(validation.errors)[0] || 'Thao tác không hợp lệ.';
    throw new Error(firstError);
  }

  const trimmedNote = payload.note?.trim() || undefined;
  const assigneeEmails = ticket.assigneeIds
    .map((uid) => ticket.assigneeSnapshots[uid]?.email)
    .filter((e): e is string => Boolean(e));

  // Group I: EDIT_OLD
  if (ticket.groupType === 'EDIT_OLD') {
    if (action === 'OM_COMPLETE') {
      return {
        nextStatus: 'PENDING_PD_CHECK',
        ticketPatch: { status: 'PENDING_PD_CHECK', updatedAt: nowMs },
        historyAction: 'OM_COMPLETE',
        historyNote: trimmedNote,
        emailPlan: {
          eventType: 'OM_COMPLETED',
          recipients: [ticket.createdByEmail],
          note: trimmedNote,
        },
      };
    }
    if (action === 'PD_REJECT_REWORK') {
      return {
        nextStatus: 'WAITING_OM',
        ticketPatch: { status: 'WAITING_OM', updatedAt: nowMs },
        historyAction: 'PD_REJECT_REWORK',
        historyNote: trimmedNote,
        emailPlan: {
          eventType: 'REWORK_REQUESTED',
          recipients: assigneeEmails,
          note: trimmedNote,
        },
      };
    }
    if (action === 'PD_CLOSE') {
      return {
        nextStatus: 'CLOSED',
        ticketPatch: { status: 'CLOSED', closedAt: nowMs, updatedAt: nowMs },
        historyAction: 'PD_CLOSE',
        historyNote: trimmedNote,
        emailPlan: null,
      };
    }
  }

  // Group II: NEW_LISTING
  if (ticket.groupType === 'NEW_LISTING') {
    if (action === 'OM_SUBMIT_LISTING') {
      const expectedSku = payload.expectedSku!.trim();
      return {
        nextStatus: 'PENDING_GOLIVE_APPROVAL',
        ticketPatch: {
          status: 'PENDING_GOLIVE_APPROVAL',
          expectedSku,
          updatedAt: nowMs,
        },
        historyAction: 'OM_SUBMIT_LISTING',
        historyNote: trimmedNote,
        historyMetadata: { expectedSku },
        emailPlan: {
          eventType: 'OM_COMPLETED',
          recipients: [ticket.createdByEmail],
          expectedSku,
          note: trimmedNote,
        },
      };
    }
    if (action === 'PD_APPROVE_GOLIVE') {
      return {
        nextStatus: 'WAITING_GOLIVE',
        ticketPatch: { status: 'WAITING_GOLIVE', updatedAt: nowMs },
        historyAction: 'PD_APPROVE_GOLIVE',
        historyNote: trimmedNote,
        emailPlan: {
          eventType: 'GOLIVE_APPROVED',
          recipients: assigneeEmails,
          expectedSku: ticket.expectedSku || undefined,
          note: trimmedNote,
        },
      };
    }
    if (action === 'OM_SUBMIT_GOLIVE') {
      const productUrl = payload.productUrl!.trim();
      return {
        nextStatus: 'PENDING_CLOSE',
        ticketPatch: {
          status: 'PENDING_CLOSE',
          productUrl,
          updatedAt: nowMs,
        },
        historyAction: 'OM_SUBMIT_GOLIVE',
        historyNote: trimmedNote,
        historyMetadata: { productUrl },
        emailPlan: {
          eventType: 'GOLIVE_SUBMITTED',
          recipients: [ticket.createdByEmail],
          expectedSku: ticket.expectedSku || undefined,
          productUrl,
          note: trimmedNote,
        },
      };
    }
    if (action === 'PD_REJECT_REWORK') {
      // At PENDING_GOLIVE_APPROVAL -> back to WAITING_LISTING; at PENDING_CLOSE -> back to WAITING_GOLIVE
      const backStatus: TicketStatus =
        ticket.status === 'PENDING_CLOSE' ? 'WAITING_GOLIVE' : 'WAITING_LISTING';
      return {
        nextStatus: backStatus,
        ticketPatch: { status: backStatus, updatedAt: nowMs },
        historyAction: 'PD_REJECT_REWORK',
        historyNote: trimmedNote,
        emailPlan: {
          eventType: 'REWORK_REQUESTED',
          recipients: assigneeEmails,
          note: trimmedNote,
        },
      };
    }
    if (action === 'PD_CLOSE') {
      return {
        nextStatus: 'CLOSED',
        ticketPatch: { status: 'CLOSED', closedAt: nowMs, updatedAt: nowMs },
        historyAction: 'PD_CLOSE',
        historyNote: trimmedNote,
        emailPlan: null,
      };
    }
  }

  // Group III: OFFICE
  if (ticket.groupType === 'OFFICE') {
    if (action === 'OM_COMPLETE') {
      const currentStates = ticket.assigneeStates || {};
      const nextStates: Record<string, AssigneeProgressState> = { ...currentStates };
      nextStates[actor.uid] = {
        completed: true,
        completedAt: nowMs,
        note: trimmedNote,
        reworkRequestedAt: null,
      };

      const totalCount = ticket.assigneeIds.length;
      const completedCount = ticket.assigneeIds.filter((uid) => nextStates[uid]?.completed).length;
      const allDone = completedCount === totalCount;
      const nextStatus: TicketStatus = allDone ? 'PENDING_PD_CHECK' : 'WAITING_OM';

      return {
        nextStatus,
        ticketPatch: {
          status: nextStatus,
          assigneeStates: nextStates,
          updatedAt: nowMs,
        },
        historyAction: allDone ? 'OM_COMPLETE' : 'OM_CHECK_PARTIAL',
        historyNote: trimmedNote,
        historyMetadata: { completedCount, totalCount },
        emailPlan: allDone
          ? {
              eventType: 'OM_COMPLETED',
              recipients: [ticket.createdByEmail],
              note: trimmedNote,
            }
          : null,
      };
    }

    if (action === 'PD_REJECT_REWORK') {
      const targetUids = payload.reworkTargetUids || [];
      const currentStates = ticket.assigneeStates || {};
      const nextStates: Record<string, AssigneeProgressState> = { ...currentStates };

      for (const uid of targetUids) {
        nextStates[uid] = {
          completed: false,
          completedAt: null,
          note: currentStates[uid]?.note,
          reworkRequestedAt: nowMs,
        };
      }

      const targetNames = targetUids.map(
        (uid) => ticket.assigneeSnapshots[uid]?.displayName || uid
      );
      const targetEmails = targetUids
        .map((uid) => ticket.assigneeSnapshots[uid]?.email)
        .filter((e): e is string => Boolean(e));

      return {
        nextStatus: 'WAITING_OM',
        ticketPatch: {
          status: 'WAITING_OM',
          assigneeStates: nextStates,
          updatedAt: nowMs,
        },
        historyAction: 'PD_REJECT_REWORK',
        historyNote: trimmedNote,
        historyMetadata: {
          reworkTargetUids: targetUids,
          reworkTargetNames: targetNames,
        },
        emailPlan: {
          eventType: 'REWORK_REQUESTED',
          recipients: targetEmails,
          note: trimmedNote,
        },
      };
    }

    if (action === 'PD_CLOSE') {
      return {
        nextStatus: 'CLOSED',
        ticketPatch: { status: 'CLOSED', closedAt: nowMs, updatedAt: nowMs },
        historyAction: 'PD_CLOSE',
        historyNote: trimmedNote,
        emailPlan: null,
      };
    }
  }

  throw new Error('Unhandled transition action');
}

export function getOfficeProgress(ticket: Ticket): { completed: number; total: number } {
  const total = ticket.assigneeIds.length;
  if (ticket.groupType !== 'OFFICE') {
    return { completed: ticket.status === 'CLOSED' ? 1 : 0, total: 1 };
  }
  const completed = ticket.assigneeIds.filter((uid) => ticket.assigneeStates?.[uid]?.completed).length;
  return { completed, total };
}
