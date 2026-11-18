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

const pd1: UserProfile = {
  uid: 'pd-1',
  email: 'pd1@joytime.vn',
  displayName: 'Minh PD 1',
  avatarDataUrl: '',
  role: 'PD',
  createdAt: 1000,
  updatedAt: 1000,
};

const pd2: UserProfile = {
  uid: 'pd-2',
  email: 'pd2@joytime.vn',
  displayName: 'Nam PD 2',
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
    createdBy: pd1.uid,
    createdByName: pd1.displayName,
    createdByEmail: pd1.email,
    reviewerId: pd1.uid,
    reviewerName: pd1.displayName,
    reviewerEmail: pd1.email,
    assigneeIds: [om1.uid],
    assigneeSnapshots: {
      [om1.uid]: { uid: om1.uid, displayName: om1.displayName, email: om1.email, avatarDataUrl: '' },
      [om2.uid]: { uid: om2.uid, displayName: om2.displayName, email: om2.email, avatarDataUrl: '' },
      [pd2.uid]: { uid: pd2.uid, displayName: pd2.displayName, email: pd2.email, avatarDataUrl: '' },
    },
    createdAt: 1000,
    updatedAt: 1000,
    closedAt: null,
    ...overrides,
  };
}

describe('Create Ticket Validation & OM Listing Auto-Pass', () => {
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

  it('requires expectedSku, productUrl, and assigned PD reviewer when OM creates NEW_LISTING and auto-passes listing step', () => {
    const missing = validateCreateTicketInput(
      {
        groupType: 'NEW_LISTING',
        title: 'OM Listing SP',
        productBasicInfo: 'Sản phẩm A',
        deadline: 999999,
        assigneeIds: [om1.uid],
      },
      'OM'
    );
    expect(missing.valid).toBe(false);
    expect(missing.errors.expectedSku).toBeTruthy();
    expect(missing.errors.productUrl).toBeTruthy();
    expect(missing.errors.reviewerId).toBeTruthy();

    const valid = validateCreateTicketInput(
      {
        groupType: 'NEW_LISTING',
        title: 'OM Listing SP',
        productBasicInfo: 'Sản phẩm A',
        expectedSku: 'SKU-OM-01',
        productUrl: 'https://joytime.vn/sp-a',
        reviewerId: pd2.uid,
        deadline: 999999,
        assigneeIds: [om1.uid],
      },
      'OM'
    );
    expect(valid.valid).toBe(true);
    expect(getInitialStatusForCreation('NEW_LISTING', 'OM')).toBe('PENDING_GOLIVE_APPROVAL');
    expect(getInitialStatusForCreation('NEW_LISTING', 'PD')).toBe('WAITING_LISTING');
  });

  it('allows only assigned reviewer PD (not other PDs) to approve/reject, and only creator to delete', () => {
    const omCreatedListing = makeBaseTicket({
      code: 'LS-0009',
      groupType: 'NEW_LISTING',
      status: 'PENDING_GOLIVE_APPROVAL',
      createdBy: om1.uid,
      createdByName: om1.displayName,
      createdByEmail: om1.email,
      reviewerId: pd2.uid,
      reviewerName: pd2.displayName,
      reviewerEmail: pd2.email,
      assigneeIds: [om1.uid],
      expectedSku: 'SKU-OM-01',
      productUrl: 'https://joytime.vn/sp-a',
    });

    // Assigned PD (pd2) can approve/reject; pd1 CANNOT interact with approval
    expect(getAvailableActions(omCreatedListing, pd2)).toEqual([
      'PD_APPROVE_GOLIVE',
      'PD_REJECT_REWORK',
    ]);
    expect(getAvailableActions(omCreatedListing, pd1)).toEqual([]);

    // Only creator (om1) can delete; pd1 and pd2 cannot delete
    expect(canDeleteTicket(omCreatedListing, om1)).toBe(true);
    expect(canDeleteTicket(omCreatedListing, pd1)).toBe(false);
    expect(canDeleteTicket(omCreatedListing, pd2)).toBe(false);
  });
});

describe('Group I (EDIT_OLD) State Machine & Cross-Role Assignment', () => {
  it('allows assigning a PD as executor and keeps reviewer separate', () => {
    let ticket = makeBaseTicket({
      groupType: 'EDIT_OLD',
      status: 'WAITING_OM',
      assigneeIds: [pd2.uid],
    });

    expect(getAvailableActions(ticket, pd2)).toEqual(['OM_COMPLETE']);
    expect(getAvailableActions(ticket, pd1)).toEqual([]);

    const step1 = computeTransitionResult(ticket, pd2, 'OM_COMPLETE', { note: 'PD2 đã xử lý' }, 2000);
    expect(step1.nextStatus).toBe('PENDING_PD_CHECK');
    expect(step1.emailPlan?.recipients).toEqual([pd1.email]);

    ticket = { ...ticket, ...step1.ticketPatch };
    expect(getAvailableActions(ticket, pd1)).toEqual(['PD_CLOSE', 'PD_REJECT_REWORK']);
    expect(getAvailableActions(ticket, pd2)).toEqual([]);

    const step2 = computeTransitionResult(ticket, pd1, 'PD_CLOSE', {}, 3000);
    expect(step2.nextStatus).toBe('CLOSED');
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
    expect(s1.emailPlan?.recipients).toEqual([pd1.email]);

    ticket = { ...ticket, ...s1.ticketPatch };
    const s2 = computeTransitionResult(ticket, pd1, 'PD_APPROVE_GOLIVE', {}, 3000);
    expect(s2.nextStatus).toBe('WAITING_GOLIVE');
    expect(s2.emailPlan?.recipients).toEqual([om1.email]);

    ticket = { ...ticket, ...s2.ticketPatch };
    const s3 = computeTransitionResult(
      ticket,
      om1,
      'OM_SUBMIT_GOLIVE',
      { productUrl: 'https://joytime.vn/products/new-888' },
      4000
    );
    expect(s3.nextStatus).toBe('PENDING_CLOSE');

    ticket = { ...ticket, ...s3.ticketPatch };
    const s4Reject = computeTransitionResult(
      ticket,
      pd1,
      'PD_REJECT_REWORK',
      { note: 'Link bị lỗi 404' },
      4500
    );
    expect(s4Reject.nextStatus).toBe('WAITING_GOLIVE');

    ticket = { ...ticket, ...s4Reject.ticketPatch };
    const s5 = computeTransitionResult(
      ticket,
      om1,
      'OM_SUBMIT_GOLIVE',
      { productUrl: 'https://joytime.vn/products/new-888-fixed' },
      5000
    );
    ticket = { ...ticket, ...s5.ticketPatch };
    const s6 = computeTransitionResult(ticket, pd1, 'PD_CLOSE', {}, 6000);
    expect(s6.nextStatus).toBe('CLOSED');
  });
});

describe('Group III (OFFICE) Multi-Assignee & Selective Rework', () => {
  it('only notifies reviewer when all N assignees complete, and resets only targeted ones on rework', () => {
    let ticket = makeBaseTicket({
      code: 'VP-0001',
      groupType: 'OFFICE',
      status: 'WAITING_OM',
      assigneeIds: [om1.uid, pd2.uid],
      assigneeStates: {
        [om1.uid]: { completed: false, completedAt: null },
        [pd2.uid]: { completed: false, completedAt: null },
      },
    });

    const s1 = computeTransitionResult(ticket, om1, 'OM_COMPLETE', {}, 2000);
    expect(s1.nextStatus).toBe('WAITING_OM');
    expect(s1.emailPlan).toBeNull();

    ticket = { ...ticket, ...s1.ticketPatch };
    const s2 = computeTransitionResult(ticket, pd2, 'OM_COMPLETE', {}, 3000);
    expect(s2.nextStatus).toBe('PENDING_PD_CHECK');
    expect(s2.emailPlan?.recipients).toEqual([pd1.email]);

    ticket = { ...ticket, ...s2.ticketPatch };
    const s3 = computeTransitionResult(
      ticket,
      pd1,
      'PD_REJECT_REWORK',
      { note: 'Cập nhật lại file báo cáo', reworkTargetUids: [om1.uid] },
      4000
    );
    expect(s3.nextStatus).toBe('WAITING_OM');
    expect(s3.ticketPatch.assigneeStates?.[om1.uid]?.completed).toBe(false);
    expect(s3.ticketPatch.assigneeStates?.[pd2.uid]?.completed).toBe(true);
    expect(s3.emailPlan?.recipients).toEqual([om1.email]);
  });
});

describe('Overdue & Team-Wide Statistics', () => {
  it('flags open past-deadline tickets as overdue and aggregates all active staff', () => {
    const now = 100_000;
    const t1 = makeBaseTicket({ id: '1', status: 'WAITING_OM', deadline: 90_000, assigneeIds: [om1.uid] });
    const t2 = makeBaseTicket({ id: '2', status: 'CLOSED', deadline: 80_000, assigneeIds: [om1.uid] });
    const t3 = makeBaseTicket({ id: '3', status: 'PENDING_PD_CHECK', deadline: 120_000, assigneeIds: [pd2.uid] });

    expect(isTicketOverdue(t1, now)).toBe(true);
    expect(isTicketOverdue(t2, now)).toBe(false);
    expect(isTicketOverdue(t3, now)).toBe(false);

    const omStats = computeStatistics([t1, t2, t3], [pd1, pd2, om1, om2], om1, now);
    expect(omStats.totalTickets).toBe(3);
    expect(omStats.overdueTickets).toBe(1);
    expect(omStats.byStaff).toHaveLength(2);
  });
});
