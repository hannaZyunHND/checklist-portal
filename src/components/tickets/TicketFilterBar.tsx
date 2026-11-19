import { useState } from 'react';
import { AlertTriangle, Filter, RotateCcw, Search, UserCheck } from 'lucide-react';
import { ALL_STATUSES } from '../../domain/ticketStats';
import {
  TICKET_GROUP_LABELS,
  TICKET_STATUS_LABELS,
  type TicketGroupType,
  type TicketStatus,
} from '../../types/ticket';
import { ACCOUNT_ROLE_LABELS, type UserProfile } from '../../types/user';
import { ModalOrSheet } from '../ui/ModalOrSheet';

function formatMemberOptionLabel(member: UserProfile): string {
  return `${member.displayName} (${ACCOUNT_ROLE_LABELS[member.role]})`;
}

export interface TicketFilterState {
  search: string;
  groupType: TicketGroupType | 'ALL';
  status: TicketStatus | 'ALL';
  assigneeId: string | 'ALL';
  overdueOnly: boolean;
  mineOnly: boolean;
}

interface TicketFilterBarProps {
  filters: TicketFilterState;
  onChange: (next: TicketFilterState) => void;
  users: UserProfile[];
}

export function TicketFilterBar({ filters, onChange, users }: TicketFilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeFilterCount =
    (filters.groupType !== 'ALL' ? 1 : 0) +
    (filters.status !== 'ALL' ? 1 : 0) +
    (filters.assigneeId !== 'ALL' ? 1 : 0) +
    (filters.overdueOnly ? 1 : 0) +
    (filters.mineOnly ? 1 : 0);

  const resetFilters = () =>
    onChange({
      search: '',
      groupType: 'ALL',
      status: 'ALL',
      assigneeId: 'ALL',
      overdueOnly: false,
      mineOnly: false,
    });

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 md:p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Tìm mã ID, tiêu đề, SKU..."
            aria-label="Tìm kiếm ticket"
            className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-base text-slate-900 placeholder:text-slate-400 md:text-sm"
          />
        </div>

        {/* Mobile Filter Button */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:hidden"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          <span>Bộ lọc</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Desktop Selects */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <select
            aria-label="Lọc theo nhóm việc"
            value={filters.groupType}
            onChange={(e) =>
              onChange({ ...filters, groupType: e.target.value as TicketGroupType | 'ALL' })
            }
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value="ALL">Tất cả nhóm việc</option>
            <option value="EDIT_OLD">{TICKET_GROUP_LABELS.EDIT_OLD}</option>
            <option value="NEW_LISTING">{TICKET_GROUP_LABELS.NEW_LISTING}</option>
            <option value="OFFICE">{TICKET_GROUP_LABELS.OFFICE}</option>
          </select>

          <select
            aria-label="Lọc theo trạng thái"
            value={filters.status}
            onChange={(e) =>
              onChange({ ...filters, status: e.target.value as TicketStatus | 'ALL' })
            }
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {TICKET_STATUS_LABELS[st]}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc theo nhân sự"
            value={filters.assigneeId}
            onChange={(e) => onChange({ ...filters, assigneeId: e.target.value })}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            <option value="ALL">Tất cả nhân sự</option>
            {users.map((member) => (
              <option key={member.uid} value={member.uid}>
                {formatMemberOptionLabel(member)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onChange({ ...filters, mineOnly: !filters.mineOnly })}
            aria-pressed={filters.mineOnly}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              filters.mineOnly
                ? 'border-teal-600 bg-teal-50 text-teal-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="h-4 w-4 text-teal-600" aria-hidden="true" />
            <span>Liên quan tới tôi</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...filters, overdueOnly: !filters.overdueOnly })}
            aria-pressed={filters.overdueOnly}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              filters.overdueOnly
                ? 'border-amber-500 bg-amber-100 text-amber-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span>Quá hạn</span>
          </button>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Mobile Filter Chips */}
      <div className="flex flex-wrap gap-2 md:hidden">
        <button
          type="button"
          onClick={() => onChange({ ...filters, mineOnly: !filters.mineOnly })}
          aria-pressed={filters.mineOnly}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            filters.mineOnly
              ? 'border-teal-600 bg-teal-50 text-teal-900'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" />
          <span>Liên quan tới tôi</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...filters, overdueOnly: !filters.overdueOnly })}
          aria-pressed={filters.overdueOnly}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            filters.overdueOnly
              ? 'border-amber-500 bg-amber-100 text-amber-900'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
          <span>Quá hạn</span>
        </button>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {/* Mobile Bottom-Sheet Filter Drawer */}
      <ModalOrSheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Bộ lọc công việc"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-800">Nhóm công việc</label>
            <select
              value={filters.groupType}
              onChange={(e) =>
                onChange({ ...filters, groupType: e.target.value as TicketGroupType | 'ALL' })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
            >
              <option value="ALL">Tất cả nhóm việc</option>
              <option value="EDIT_OLD">{TICKET_GROUP_LABELS.EDIT_OLD}</option>
              <option value="NEW_LISTING">{TICKET_GROUP_LABELS.NEW_LISTING}</option>
              <option value="OFFICE">{TICKET_GROUP_LABELS.OFFICE}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800">Trạng thái</label>
            <select
              value={filters.status}
              onChange={(e) =>
                onChange({ ...filters, status: e.target.value as TicketStatus | 'ALL' })
              }
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
            >
              <option value="ALL">Tất cả trạng thái</option>
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {TICKET_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800">Nhân sự được giao</label>
            <select
              value={filters.assigneeId}
              onChange={(e) => onChange({ ...filters, assigneeId: e.target.value })}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900"
            >
              <option value="ALL">Tất cả nhân sự</option>
              {users.map((member) => (
                <option key={member.uid} value={member.uid}>
                  {formatMemberOptionLabel(member)}
                </option>
              ))}
            </select>
          </div>

          <label className="flex min-h-[44px] items-center gap-2.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900">
            <input
              type="checkbox"
              checked={filters.mineOnly}
              onChange={(e) => onChange({ ...filters, mineOnly: e.target.checked })}
              className="h-4 w-4 accent-teal-600"
            />
            <span>Chỉ hiển thị task liên quan tới tôi</span>
          </label>

          <label className="flex min-h-[44px] items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            <input
              type="checkbox"
              checked={filters.overdueOnly}
              onChange={(e) => onChange({ ...filters, overdueOnly: e.target.checked })}
              className="h-4 w-4 accent-amber-600"
            />
            <span>Chỉ hiển thị ticket đang Quá hạn (Overdue)</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                resetFilters();
                setDrawerOpen(false);
              }}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700"
            >
              Xóa bộ lọc
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="min-h-[44px] flex-1 rounded-lg bg-teal-600 text-sm font-semibold text-white"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </ModalOrSheet>
    </div>
  );
}
