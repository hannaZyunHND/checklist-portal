import { describe, expect, it } from 'vitest';
import {
  canDeleteTicket,
  computeTransitionResult,
  getAvailableActions,
  getInitialStatusForCreation,
  validateCreateTicketInput,
  validateTransition,
} from './ticketStateMachine';
import { computeStatistics, isTicketOverdue } from './ticketStats';
import type { Ticket } from '../types/ticket';
import type { UserProfile } from '../types/user';

const manager1: UserProfile = {
  uid: 'mgr-1',
  email: 'mgr1@joytime.vn',
  displayName: 'Minh Quản lý',
  avatarDataUrl: '',
  role: 'MANAGER',
  department: 'PD',
  createdAt: 1000,
  updatedAt: 1000,
};

const staff1: UserProfile = {
  uid: 'stf-1',
  email: 'stf1@joytime.vn',
  displayName: 'Lan Nhân viên',
  avatarDataUrl: '',
  role: 'STAFF',
  department: 'OM',
  createdAt: 1000,
  updatedAt: 1000,
};

const staff2: UserProfile = {
  uid: 'stf-2',
  email: 'stf2@joytime.vn',
  displayName: 'Hùng Nhân viên',
  avatarDataUrl: '',
  role: 'STAFF',
  department: 'PD',
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
    createdBy: manager1.uid,
    createdByName: manager1.displayName,
    createdByEmail: manager1.email,
    reviewerId: manager1.uid,
    reviewerName: manager1.displayName,
    reviewerEmail: manager1.email,
    assigneeIds: [staff1.uid],
    assigneeSnapshots: {
      [staff1.uid]: { uid: staff1.uid, displayName: staff1.displayName, email: staff1.email, avatarDataUrl: '' },
      [staff2.uid]: { uid: staff2.uid, displayName: staff2.displayName, email: staff2.email, avatarDataUrl: '' },
      [manager1.uid]: { uid: manager1.uid, displayName: manager1.displayName, email: manager1.email, avatarDataUrl: '' },
    },
    createdAt: 1000,
    updatedAt: 1000,
    closedAt: null,
    ...overrides,
  };
}

describe('Create Ticket Validation & Role-in-Task Assignment', () => {
  it('allows any account (MANAGER or STAFF) to create any of the 3 groups and only creator can delete', () => {
    const editByStaff = validateCreateTicketInput({
      groupType: 'EDIT_OLD',
      title: 'Sửa giá',
      sku: 'SKU-1',
      editRequirements: 'Giảm 10%',
      deadline: 999999,
      assigneeIds: [manager1.uid],
    });
    expect(editByStaff.valid).toBe(true);

    const listingByStaff = validateCreateTicketInput({
      groupType: 'NEW_LISTING',
      title: 'Listing mới',
      productBasicInfo: 'Bình nước',
      expectedSku: 'SKU-NEW',
      autoPassListing: true,
      reviewerId: staff2.uid,
      deadline: 999999,
      assigneeIds: [staff1.uid],
    });
    expect(listingByStaff.valid).toBe(true);
    expect(
      getInitialStatusForCreation({ groupType: 'NEW_LISTING', autoPassListing: true })
    ).toBe('PENDING_GOLIVE_APPROVAL');
    expect(
      getInitialStatusForCreation({ groupType: 'NEW_LISTING', autoPassListing: false })
    ).toBe('WAITING_LISTING');

    const ticket = makeBaseTicket({ createdBy: staff1.uid, reviewerId: staff2.uid });
    expect(canDeleteTicket(ticket, staff1)).toBe(true);
    expect(canDeleteTicket(ticket, manager1)).toBe(false);
    expect(canDeleteTicket(ticket, staff2)).toBe(false);
  });
});

describe('Group I (EDIT_OLD): OM thực hiện => OM GoLive => Đóng Task (không có PD)', () => {
  it('runs WAITING_OM -> WAITING_GOLIVE -> CLOSED purely by task OM assignee', () => {
    let ticket = makeBaseTicket({
      groupType: 'EDIT_OLD',
      status: 'WAITING_OM',
      reviewerId: null,
      reviewerName: null,
      reviewerEmail: null,
      assigneeIds: [staff1.uid],
    });

    expect(getAvailableActions(ticket, staff1)).toEqual(['OM_COMPLETE']);
    expect(getAvailableActions(ticket, manager1)).toEqual([]);

    const step1 = computeTransitionResult(ticket, staff1, 'OM_COMPLETE', { note: 'Đã sửa' }, 2000);
    expect(step1.nextStatus).toBe('WAITING_GOLIVE');
    expect(step1.emailPlan).toBeNull();

    ticket = { ...ticket, ...step1.ticketPatch };
    expect(getAvailableActions(ticket, staff1)).toEqual(['OM_CLOSE_EDIT_GOLIVE']);
    expect(getAvailableActions(ticket, manager1)).toEqual([]);

    const step2 = computeTransitionResult(
      ticket,
      staff1,
      'OM_CLOSE_EDIT_GOLIVE',
      { note: 'Đã GoLive cập nhật' },
      3000
    );
    expect(step2.nextStatus).toBe('CLOSED');
    expect(step2.ticketPatch.closedAt).toBe(3000);
  });
});

describe('Group II (NEW_LISTING): OM listing => PD check => OM GoLive => Đóng Task', () => {
  it('enforces SKU on listing, assigned PD check (blocks other accounts), and closes directly when OM submits GoLive URL', () => {
    let ticket = makeBaseTicket({
      code: 'LS-0001',
      groupType: 'NEW_LISTING',
      status: 'WAITING_LISTING',
      createdBy: staff1.uid,
      assigneeIds: [staff1.uid],
      reviewerId: staff2.uid,
      reviewerName: staff2.displayName,
      reviewerEmail: staff2.email,
    });

    const missingSku = validateTransition(ticket, staff1, 'OM_SUBMIT_LISTING', {});
    expect(missingSku.valid).toBe(false);

    const s1 = computeTransitionResult(
      ticket,
      staff1,
      'OM_SUBMIT_LISTING',
      { expectedSku: 'JT-NEW-888' },
      2000
    );
    expect(s1.nextStatus).toBe('PENDING_GOLIVE_APPROVAL');
    expect(s1.emailPlan?.recipients).toEqual([staff2.email]);

    ticket = { ...ticket, ...s1.ticketPatch };
    // Only assigned reviewer (staff2) can approve/reject; manager1 & staff1 cannot
    expect(getAvailableActions(ticket, staff2)).toEqual(['PD_APPROVE_GOLIVE', 'PD_REJECT_REWORK']);
    expect(getAvailableActions(ticket, manager1)).toEqual([]);
    expect(getAvailableActions(ticket, staff1)).toEqual([]);

    // Reject returns to WAITING_LISTING
    const s1Reject = computeTransitionResult(ticket, staff2, 'PD_REJECT_REWORK', { note: 'Thiếu ảnh' }, 2500);
    expect(s1Reject.nextStatus).toBe('WAITING_LISTING');

    ticket = { ...ticket, status: 'PENDING_GOLIVE_APPROVAL' };
    const s2 = computeTransitionResult(ticket, staff2, 'PD_APPROVE_GOLIVE', {}, 3000);
    expect(s2.nextStatus).toBe('WAITING_GOLIVE');
    expect(s2.emailPlan?.recipients).toEqual([staff1.email]);

    ticket = { ...ticket, ...s2.ticketPatch };
    const badUrl = validateTransition(ticket, staff1, 'OM_SUBMIT_GOLIVE', { productUrl: 'invalid' });
    expect(badUrl.valid).toBe(false);

    // OM submits GoLive URL -> closes task directly!
    const s3 = computeTransitionResult(
      ticket,
      staff1,
      'OM_SUBMIT_GOLIVE',
      { productUrl: 'https://joytime.vn/products/new-888' },
      4000
    );
    expect(s3.nextStatus).toBe('CLOSED');
    expect(s3.ticketPatch.closedAt).toBe(4000);
    expect(s3.ticketPatch.productUrl).toBe('https://joytime.vn/products/new-888');
  });
});

describe('Group III (OFFICE) Multi-Assignee & Selective Rework', () => {
  it('only notifies reviewer when all N assignees complete, omits undefined note, and resets only targeted ones on rework', () => {
    let ticket = makeBaseTicket({
      code: 'VP-0001',
      groupType: 'OFFICE',
      status: 'WAITING_OM',
      assigneeIds: [staff1.uid, staff2.uid],
      reviewerId: manager1.uid,
      assigneeStates: {
        [staff1.uid]: { completed: false, completedAt: null },
        [staff2.uid]: { completed: false, completedAt: null },
      },
    });

    const s1 = computeTransitionResult(ticket, staff1, 'OM_COMPLETE', {}, 2000);
    expect(s1.nextStatus).toBe('WAITING_OM');
    expect(s1.emailPlan).toBeNull();
    expect(s1.ticketPatch.assigneeStates?.[staff1.uid]).not.toHaveProperty('note');

    ticket = { ...ticket, ...s1.ticketPatch };
    const s2 = computeTransitionResult(ticket, staff2, 'OM_COMPLETE', {}, 3000);
    expect(s2.nextStatus).toBe('PENDING_PD_CHECK');
    expect(s2.emailPlan?.recipients).toEqual([manager1.email]);

    ticket = { ...ticket, ...s2.ticketPatch };
    const s3 = computeTransitionResult(
      ticket,
      manager1,
      'PD_REJECT_REWORK',
      { note: 'Cập nhật lại file báo cáo', reworkTargetUids: [staff1.uid] },
      4000
    );
    expect(s3.nextStatus).toBe('WAITING_OM');
    expect(s3.ticketPatch.assigneeStates?.[staff1.uid]?.completed).toBe(false);
    expect(s3.ticketPatch.assigneeStates?.[staff1.uid]).not.toHaveProperty('note');
    expect(s3.ticketPatch.assigneeStates?.[staff2.uid]?.completed).toBe(true);
    expect(s3.emailPlan?.recipients).toEqual([staff1.email]);
  });
});

describe('Overdue & Team-Wide Statistics', () => {
  it('flags open past-deadline tickets as overdue and aggregates all active staff', () => {
    const now = 100_000;
    const t1 = makeBaseTicket({ id: '1', status: 'WAITING_OM', deadline: 90_000, assigneeIds: [staff1.uid] });
    const t2 = makeBaseTicket({ id: '2', status: 'CLOSED', deadline: 80_000, assigneeIds: [staff1.uid] });
    const t3 = makeBaseTicket({ id: '3', status: 'PENDING_PD_CHECK', deadline: 120_000, assigneeIds: [staff2.uid] });

    expect(isTicketOverdue(t1, now)).toBe(true);
    expect(isTicketOverdue(t2, now)).toBe(false);
    expect(isTicketOverdue(t3, now)).toBe(false);

    const stats = computeStatistics([t1, t2, t3], [manager1, staff1, staff2], staff1, now);
    expect(stats.totalTickets).toBe(3);
    expect(stats.overdueTickets).toBe(1);
    expect(stats.byStaff).toHaveLength(2);
  });
});
