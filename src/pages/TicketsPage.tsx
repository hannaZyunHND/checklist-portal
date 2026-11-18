import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { canDeleteTicket, getTicketReviewerId } from '../domain/ticketStateMachine';
import { isTicketOverdue } from '../domain/ticketStats';
import { deleteTicket } from '../services/ticketService';
import type { Ticket, TicketGroupType, TicketStatus } from '../types/ticket';
import type { UserProfile } from '../types/user';
import { DeleteTicketModal } from '../components/tickets/DeleteTicketModal';
import { TicketCardList } from '../components/tickets/TicketCardList';
import { TicketFilterBar, type TicketFilterState } from '../components/tickets/TicketFilterBar';
import { TicketTable } from '../components/tickets/TicketTable';

interface TicketsPageProps {
  tickets: Ticket[];
  users: UserProfile[];
  nowMs: number;
  onOpenCreateTicket: () => void;
}

export function TicketsPage({ tickets, users, nowMs, onOpenCreateTicket }: TicketsPageProps) {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  const [filters, setFilters] = useState<TicketFilterState>(() => ({
    search: '',
    groupType: (searchParams.get('group') as TicketGroupType) || 'ALL',
    status: (searchParams.get('status') as TicketStatus) || 'ALL',
    assigneeId: searchParams.get('assignee') || 'ALL',
    overdueOnly: searchParams.get('overdue') === '1',
    mineOnly: searchParams.get('mine') === '1',
  }));

  useEffect(() => {
    const overdue = searchParams.get('overdue') === '1';
    const mine = searchParams.get('mine') === '1';
    const status = searchParams.get('status') as TicketStatus | null;
    const assignee = searchParams.get('assignee');
    if (overdue || mine || status || assignee) {
      setFilters((prev) => ({
        ...prev,
        overdueOnly: overdue || prev.overdueOnly,
        mineOnly: mine || prev.mineOnly,
        status: status || prev.status,
        assigneeId: assignee || prev.assigneeId,
      }));
    }
  }, [searchParams]);

  const filteredTickets = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filters.groupType !== 'ALL' && t.groupType !== filters.groupType) return false;
      if (filters.status !== 'ALL' && t.status !== filters.status) return false;
      if (filters.assigneeId !== 'ALL' && !t.assigneeIds.includes(filters.assigneeId)) {
        return false;
      }
      if (filters.overdueOnly && !isTicketOverdue(t, nowMs)) return false;
      if (filters.mineOnly && userProfile) {
        const isRelated =
          t.createdBy === userProfile.uid ||
          getTicketReviewerId(t) === userProfile.uid ||
          t.assigneeIds.includes(userProfile.uid);
        if (!isRelated) return false;
      }

      if (q) {
        const haystack = [
          t.code,
          t.title,
          t.sku || '',
          t.expectedSku || '',
          t.createdByName,
          t.reviewerName || '',
          ...Object.values(t.assigneeSnapshots).map((s) => s.displayName),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, filters, userProfile, nowMs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
            Danh sách Công việc ({filteredTickets.length})
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Mọi thành viên có thể xem toàn bộ task; chỉ người tạo mới có quyền xóa task mình tạo.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateTicket}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Tạo Ticket mới</span>
        </button>
      </div>

      <TicketFilterBar filters={filters} onChange={setFilters} users={users} />

      {filteredTickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-slate-800">
            Không tìm thấy ticket nào phù hợp
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Thử thay đổi điều kiện lọc hoặc bấm &quot;Tạo Ticket mới&quot;.
          </p>
        </div>
      ) : (
        <>
          <TicketTable
            tickets={filteredTickets}
            nowMs={nowMs}
            canDeleteTicket={(t) => (userProfile ? canDeleteTicket(t, userProfile) : false)}
            onDeleteTicket={setTicketToDelete}
          />
          <TicketCardList tickets={filteredTickets} nowMs={nowMs} />
        </>
      )}

      <DeleteTicketModal
        ticket={ticketToDelete}
        onClose={() => setTicketToDelete(null)}
        onConfirmDelete={async (target) => {
          if (!userProfile) return;
          await deleteTicket(target.id, userProfile);
        }}
      />
    </div>
  );
}
