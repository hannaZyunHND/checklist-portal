import type { Ticket, TicketStatus } from '../types/ticket';
import type { UserProfile } from '../types/user';

export const ALL_STATUSES: TicketStatus[] = [
  'WAITING_OM',
  'WAITING_LISTING',
  'PENDING_PD_CHECK',
  'PENDING_GOLIVE_APPROVAL',
  'WAITING_GOLIVE',
  'PENDING_CLOSE',
  'CLOSED',
];

export interface StaffStatusRow {
  uid: string;
  displayName: string;
  email: string;
  avatarDataUrl: string;
  total: number;
  overdue: number;
  byStatus: Record<TicketStatus, number>;
}

export interface StatsSummary {
  totalTickets: number;
  openTickets: number;
  pendingPdTickets: number;
  overdueTickets: number;
  closedTickets: number;
  byStatus: Record<TicketStatus, number>;
  byStaff: StaffStatusRow[];
}

export function isTicketOverdue(ticket: Pick<Ticket, 'status' | 'deadline'>, nowMs = Date.now()): boolean {
  if (ticket.status === 'CLOSED') return false;
  return ticket.deadline < nowMs;
}

export function isPendingPdStatus(status: TicketStatus): boolean {
  return (
    status === 'PENDING_PD_CHECK' ||
    status === 'PENDING_GOLIVE_APPROVAL' ||
    status === 'PENDING_CLOSE'
  );
}

export function createEmptyStatusCounts(): Record<TicketStatus, number> {
  return {
    WAITING_OM: 0,
    PENDING_PD_CHECK: 0,
    WAITING_LISTING: 0,
    PENDING_GOLIVE_APPROVAL: 0,
    WAITING_GOLIVE: 0,
    PENDING_CLOSE: 0,
    CLOSED: 0,
  };
}

export function filterVisibleTicketsForUser(tickets: Ticket[], user: UserProfile): Ticket[] {
  if (user.role === 'PD') return tickets;
  return tickets.filter((t) => t.assigneeIds.includes(user.uid));
}

export function computeStatistics(
  allTickets: Ticket[],
  users: UserProfile[],
  currentUser: UserProfile,
  nowMs = Date.now()
): StatsSummary {
  const scopedTickets = filterVisibleTicketsForUser(allTickets, currentUser);
  const byStatus = createEmptyStatusCounts();
  let overdueTickets = 0;
  let closedTickets = 0;
  let pendingPdTickets = 0;

  const staffMap = new Map<string, StaffStatusRow>();

  const targetStaff =
    currentUser.role === 'PD'
      ? users.filter((u) => u.role === 'OM')
      : users.filter((u) => u.uid === currentUser.uid);

  for (const member of targetStaff) {
    staffMap.set(member.uid, {
      uid: member.uid,
      displayName: member.displayName,
      email: member.email,
      avatarDataUrl: member.avatarDataUrl,
      total: 0,
      overdue: 0,
      byStatus: createEmptyStatusCounts(),
    });
  }

  for (const ticket of scopedTickets) {
    byStatus[ticket.status] += 1;
    const overdue = isTicketOverdue(ticket, nowMs);
    if (overdue) overdueTickets += 1;
    if (ticket.status === 'CLOSED') closedTickets += 1;
    if (isPendingPdStatus(ticket.status)) pendingPdTickets += 1;

    for (const assigneeUid of ticket.assigneeIds) {
      if (currentUser.role === 'OM' && assigneeUid !== currentUser.uid) continue;

      let row = staffMap.get(assigneeUid);
      if (!row) {
        const snap = ticket.assigneeSnapshots[assigneeUid];
        row = {
          uid: assigneeUid,
          displayName: snap?.displayName || 'Nhân sự',
          email: snap?.email || '',
          avatarDataUrl: snap?.avatarDataUrl || '',
          total: 0,
          overdue: 0,
          byStatus: createEmptyStatusCounts(),
        };
        staffMap.set(assigneeUid, row);
      }

      row.total += 1;
      row.byStatus[ticket.status] += 1;
      if (overdue) row.overdue += 1;
    }
  }

  const byStaff = Array.from(staffMap.values()).sort((a, b) => b.overdue - a.overdue || b.total - a.total);

  return {
    totalTickets: scopedTickets.length,
    openTickets: scopedTickets.length - closedTickets,
    pendingPdTickets,
    overdueTickets,
    closedTickets,
    byStatus,
    byStaff,
  };
}
