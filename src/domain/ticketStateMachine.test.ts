import { describe, expect, it } from 'vitest';
import {
  computeTransitionResult,
  getAvailableActions,
  validateCreateTicketInput,
  validateTransition,
} from './ticketStateMachine';
import { computeStatistics, isTicketOverdue } from './ticketStats';
import type { Ticket } from '../types/ticket';
import type { UserProfile } from '../types/user';

const pdUser: UserProfile = {
  uid: 'pd-1',
  email: 'pd@joytime.vn',
  displayName: 'Minh PD',
  avatarDataUrl: '',
  role: 'PD',
  createdAt: 1000,
  updatedAt: 1000,
};

const om1: UserProfile = {
  uid: 'om-1',
  email: 'om1@joytime.vn',
  displayName: 'Lan OM',
  avatarDataUrl: '',
  role: 'OM',
  createdAt: 1000,
  updatedAt: 1000,
};

const om2: UserProfile = {
  uid: 'om-2',
  email: 'om2@joytime.vn',
  displayName: 'Hùng OM',
  avatarDataUrl: '',
  role: 'OM',
  createdAt: 1000,
  updatedAt: 1000,
};

function makeBaseTicket(overrides: Partial<Ticket>): Ticket {
  return {
    id: 't-1',
    code: 'CS-0001',
    groupType: 'EDIT_OLD',
    title: 'Kiểm tra SKU áo thun',
    status: 'WAITING_OM',
    deadline: 50000,
    createdBy: pdUser.uid,
    createdByName: pdUser.displayName,
    createdByEmail: pdUser.email,
    assigneeIds: [om1.uid],
    assigneeSnapshots: {
      [om1.uid]: { uid: om1.uid, displayName: om1.displayName, email: om1.email, avatarDataUrl: '' },
      [om2.uid]: { uid: om2.uid, displayName: om2.displayName, email: om2.email, avatarDataUrl: '' },
    },
    createdAt: 1000,
    updatedAt: 1000,
    closedAt: null,
    ...overrides,
  };
}

describe('Create Ticket Validation', () => {
  it('requires SKU and editRequirements for Group I', () => {
    const res = validateCreateTicketInput({
      groupType: 'EDIT_OLD',
      title: 'Test',
      deadline: 999999,
      assigneeIds: [om1.uid],
    });
    expect(res.valid).toBe(false);
    expect(res.errors.sku).toBeTruthy();
    expect(res.errors.editRequirements).toBeTruthy();
  });

  it('requires deadline and at least one assignee for Group III OFFICE', () => {
    const res = validateCreateTicketInput({
      groupType: 'OFFICE',
      title: 'Dọn kho',
      deadline: NaN,
      assigneeIds: [],
      officeRequirements: 'Kiểm kê cuối tháng',
    });
    expect(res.valid).toBe(false);
    expect(res.errors.deadline).toBeTruthy();
    expect(res.errors.assigneeIds).toBeTruthy();
  });
});

describe('Group I (EDIT_OLD) State Machine', () => {
  it('runs OM complete -> PD reject -> OM complete -> PD close', () => {
    let ticket = makeBaseTicket({ groupType: 'EDIT_OLD', status: 'WAITING_OM' });

    const step1 = computeTransitionResult(ticket, om1, 'OM_COMPLETE', { note: 'Đã sửa ảnh' }, 2000);
    expect(step1.nextStatus).toBe('PENDING_PD_CHECK');
    expect(step1.emailPlan).toEqual({
      eventType: 'OM_COMPLETED',
      recipients: [pdUser.email],
      note: 'Đã sửa ảnh',
    });

    ticket = { ...ticket, ...step1.ticketPatch };
    expect(getAvailableActions(ticket, om1)).toEqual([]);
    expect(getAvailableActions(ticket, pdUser)).toEqual(['PD_CLOSE', 'PD_REJECT_REWORK']);

    const rejectMissingReason = validateTransition(ticket, pdUser, 'PD_REJECT_REWORK', {});
    expect(rejectMissingReason.valid).toBe(false);

    const step2 = computeTransitionResult(
      ticket,
      pdUser,
      'PD_REJECT_REWORK',
      { note: 'Thiếu bảng size' },
      3000
    );
    expect(step2.nextStatus).toBe('WAITING_OM');
    expect(step2.emailPlan?.recipients).toEqual([om1.email]);

    ticket = { ...ticket, ...step2.ticketPatch };
    const step3 = computeTransitionResult(ticket, om1, 'OM_COMPLETE', {}, 4000);
    ticket = { ...ticket, ...step3.ticketPatch };

    const step4 = computeTransitionResult(ticket, pdUser, 'PD_CLOSE', {}, 5000);
    expect(step4.nextStatus).toBe('CLOSED');
    expect(step4.ticketPatch.closedAt).toBe(5000);
    expect(step4.emailPlan).toBeNull();
  });
});

describe('Group II (NEW_LISTING) State Machine', () => {
  it('enforces SKU on listing, GoLive approval, URL on GoLive, and reject-to-GoLive', () => {
    let ticket = makeBaseTicket({
      code: 'LS-0001',
      groupType: 'NEW_LISTING',
      status: 'WAITING_LISTING',
    });

    const missingSku = validateTransition(ticket, om1, 'OM_SUBMIT_LISTING', {});
    expect(missingSku.valid).toBe(false);

    const s1 = computeTransitionResult(
      ticket,
      om1,
      'OM_SUBMIT_LISTING',
      { expectedSku: 'JT-NEW-888' },
      2000
    );
    expect(s1.nextStatus).toBe('PENDING_GOLIVE_APPROVAL');
    expect(s1.ticketPatch.expectedSku).toBe('JT-NEW-888');
    expect(s1.emailPlan?.recipients).toEqual([pdUser.email]);

    ticket = { ...ticket, ...s1.ticketPatch };
    // PD rejects before GoLive -> returns to WAITING_LISTING
    const s1Reject = computeTransitionResult(
      ticket,
      pdUser,
      'PD_REJECT_REWORK',
      { note: 'Sai mô tả' },
      2500
    );
    expect(s1Reject.nextStatus).toBe('WAITING_LISTING');

    // OM re-submits -> PD approves GoLive
    ticket = { ...ticket, status: 'PENDING_GOLIVE_APPROVAL' };
    const s2 = computeTransitionResult(ticket, pdUser, 'PD_APPROVE_GOLIVE', {}, 3000);
    expect(s2.nextStatus).toBe('WAITING_GOLIVE');
    expect(s2.emailPlan?.eventType).toBe('GOLIVE_APPROVED');
    expect(s2.emailPlan?.recipients).toEqual([om1.email]);

    ticket = { ...ticket, ...s2.ticketPatch };
    const badUrl = validateTransition(ticket, om1, 'OM_SUBMIT_GOLIVE', { productUrl: 'not-a-url' });
    expect(badUrl.valid).toBe(false);

    const s3 = computeTransitionResult(
      ticket,
      om1,
      'OM_SUBMIT_GOLIVE',
      { productUrl: 'https://joytime.vn/products/new-888' },
      4000
    );
    expect(s3.nextStatus).toBe('PENDING_CLOSE');
    expect(s3.emailPlan?.eventType).toBe('GOLIVE_SUBMITTED');
    expect(s3.emailPlan?.recipients).toEqual([pdUser.email]);

    // Option 2B-2: PD rejects after GoLive -> returns to WAITING_GOLIVE (step after listing)
    ticket = { ...ticket, ...s3.ticketPatch };
    const s4Reject = computeTransitionResult(
      ticket,
      pdUser,
      'PD_REJECT_REWORK',
      { note: 'Link bị lỗi 404' },
      4500
    );
    expect(s4Reject.nextStatus).toBe('WAITING_GOLIVE');
    expect(s4Reject.emailPlan?.recipients).toEqual([om1.email]);

    // OM updates URL -> PD closes
    ticket = { ...ticket, ...s4Reject.ticketPatch };
    const s5 = computeTransitionResult(
      ticket,
      om1,
      'OM_SUBMIT_GOLIVE',
      { productUrl: 'https://joytime.vn/products/new-888-fixed' },
      5000
    );
    ticket = { ...ticket, ...s5.ticketPatch };
    const s6 = computeTransitionResult(ticket, pdUser, 'PD_CLOSE', {}, 6000);
    expect(s6.nextStatus).toBe('CLOSED');
  });
});

describe('Group III (OFFICE) Multi-Assignee & Selective Rework', () => {
  it('only notifies PD when all N OMs complete, and resets only targeted OMs on rework', () => {
    let ticket = makeBaseTicket({
      code: 'VP-0001',
      groupType: 'OFFICE',
      status: 'WAITING_OM',
      assigneeIds: [om1.uid, om2.uid],
      assigneeStates: {
        [om1.uid]: { completed: false, completedAt: null },
        [om2.uid]: { completed: false, completedAt: null },
      },
    });

    // First OM completes -> stays WAITING_OM, no email
    const s1 = computeTransitionResult(ticket, om1, 'OM_COMPLETE', {}, 2000);
    expect(s1.nextStatus).toBe('WAITING_OM');
    expect(s1.historyAction).toBe('OM_CHECK_PARTIAL');
    expect(s1.emailPlan).toBeNull();

    ticket = { ...ticket, ...s1.ticketPatch };
    expect(getAvailableActions(ticket, om1)).toEqual([]);
    expect(getAvailableActions(ticket, om2)).toEqual(['OM_COMPLETE']);

    // Second OM completes -> moves to PENDING_PD_CHECK & emails PD
    const s2 = computeTransitionResult(ticket, om2, 'OM_COMPLETE', {}, 3000);
    expect(s2.nextStatus).toBe('PENDING_PD_CHECK');
    expect(s2.historyAction).toBe('OM_COMPLETE');
    expect(s2.emailPlan?.recipients).toEqual([pdUser.email]);

    ticket = { ...ticket, ...s2.ticketPatch };
    // PD targets ONLY om1 for rework
    const s3 = computeTransitionResult(
      ticket,
      pdUser,
      'PD_REJECT_REWORK',
      { note: 'Cập nhật lại file báo cáo', reworkTargetUids: [om1.uid] },
      4000
    );
    expect(s3.nextStatus).toBe('WAITING_OM');
    expect(s3.ticketPatch.assigneeStates?.[om1.uid]?.completed).toBe(false);
    expect(s3.ticketPatch.assigneeStates?.[om2.uid]?.completed).toBe(true);
    expect(s3.emailPlan?.recipients).toEqual([om1.email]);

    // om1 re-completes -> directly moves back to PENDING_PD_CHECK since om2 stayed completed
    ticket = { ...ticket, ...s3.ticketPatch };
    const s4 = computeTransitionResult(ticket, om1, 'OM_COMPLETE', {}, 5000);
    expect(s4.nextStatus).toBe('PENDING_PD_CHECK');
    expect(s4.emailPlan?.recipients).toEqual([pdUser.email]);
  });
});

describe('Overdue & Role-Scoped Statistics', () => {
  it('flags open past-deadline tickets as overdue and scopes OM stats to own tasks', () => {
    const now = 100_000;
    const t1 = makeBaseTicket({ id: '1', status: 'WAITING_OM', deadline: 90_000, assigneeIds: [om1.uid] });
    const t2 = makeBaseTicket({ id: '2', status: 'CLOSED', deadline: 80_000, assigneeIds: [om1.uid] });
    const t3 = makeBaseTicket({ id: '3', status: 'PENDING_PD_CHECK', deadline: 120_000, assigneeIds: [om2.uid] });

    expect(isTicketOverdue(t1, now)).toBe(true);
    expect(isTicketOverdue(t2, now)).toBe(false);
    expect(isTicketOverdue(t3, now)).toBe(false);

    const pdStats = computeStatistics([t1, t2, t3], [pdUser, om1, om2], pdUser, now);
    expect(pdStats.totalTickets).toBe(3);
    expect(pdStats.overdueTickets).toBe(1);
    expect(pdStats.closedTickets).toBe(1);
    expect(pdStats.byStaff).toHaveLength(2);

    const om1Stats = computeStatistics([t1, t2, t3], [pdUser, om1, om2], om1, now);
    expect(om1Stats.totalTickets).toBe(2);
    expect(om1Stats.overdueTickets).toBe(1);
    expect(om1Stats.byStaff).toHaveLength(1);
    expect(om1Stats.byStaff[0].uid).toBe(om1.uid);
  });
});
