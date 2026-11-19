import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { ALL_STATUSES, computeStatistics, isTicketOverdue } from '../domain/ticketStats';
import { TICKET_STATUS_LABELS, type Ticket } from '../types/ticket';
import type { UserProfile } from '../types/user';
import { formatOverdueDuration, formatVietnamDateTime } from '../utils/dateTime';
import { OverdueBadge, TicketGroupBadge, TicketStatusBadge } from '../components/ui/StatusBadge';
import { UserAvatar } from '../components/ui/UserAvatar';

interface DashboardPageProps {
  tickets: Ticket[];
  users: UserProfile[];
  nowMs: number;
}

export function DashboardPage({ tickets, users, nowMs }: DashboardPageProps) {
  const { userProfile } = useAuth();
  if (!userProfile) return null;

  const stats = useMemo(
    () => computeStatistics(tickets, users, userProfile, nowMs),
    [tickets, users, userProfile, nowMs]
  );

  const chartData = useMemo(
    () =>
      ALL_STATUSES.map((status) => ({
        status,
        label: TICKET_STATUS_LABELS[status],
        count: stats.byStatus[status],
      })),
    [stats]
  );

  const priorityTasks = useMemo(() => {
    const open = tickets.filter((t) => t.status !== 'CLOSED');
    return [...open]
      .sort((a, b) => {
        const aOver = isTicketOverdue(a, nowMs) ? 0 : 1;
        const bOver = isTicketOverdue(b, nowMs) ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        return a.deadline - b.deadline;
      })
      .slice(0, 8);
  }, [tickets, nowMs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
            Tổng quan &amp; Thống kê Team
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Theo dõi số lượng task theo trạng thái của từng nhân sự, toàn team và cảnh báo deadline.
          </p>
        </div>
        <Link
          to="/tickets"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <span>Xem danh sách Task</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Link
          to="/tickets"
          className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-400"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Task đang mở</span>
            <ClipboardList className="h-4 w-4 text-teal-600" aria-hidden="true" />
          </div>
          <div className="font-mono-code mt-2 text-2xl font-bold text-slate-900">
            {stats.openTickets}
          </div>
          <div className="mt-1 text-xs text-slate-500">Tổng {stats.totalTickets} ticket</div>
        </Link>

        <Link
          to="/tickets?status=PENDING_PD_CHECK"
          className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-violet-400"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Chờ kiểm tra / duyệt</span>
            <Eye className="h-4 w-4 text-violet-600" aria-hidden="true" />
          </div>
          <div className="font-mono-code mt-2 text-2xl font-bold text-violet-800">
            {stats.pendingPdTickets}
          </div>
          <div className="mt-1 text-xs text-slate-500">Bao gồm duyệt GoLive &amp; đóng</div>
        </Link>

        <Link
          to="/tickets?overdue=1"
          className={`rounded-xl border p-4 transition ${
            stats.overdueTickets > 0
              ? 'border-amber-400 bg-amber-50 hover:border-amber-500'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
            <span>Trễ hạn (Overdue)</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <div className="font-mono-code mt-2 text-2xl font-bold text-amber-900">
            {stats.overdueTickets}
          </div>
          <div className="mt-1 text-xs text-amber-800">
            {stats.overdueTickets > 0 ? 'Cần xử lý gấp' : 'Không có task trễ hạn'}
          </div>
        </Link>

        <Link
          to="/tickets?status=CLOSED"
          className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Đã đóng hoàn tất</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="font-mono-code mt-2 text-2xl font-bold text-emerald-700">
            {stats.closedTickets}
          </div>
          <div className="mt-1 text-xs text-slate-500">Hoàn thành chu trình</div>
        </Link>
      </div>

      {/* Status Distribution Chart + Accessible Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 lg:col-span-3">
          <h2 className="text-base font-semibold text-slate-900">
            Tổng số Task theo từng trạng thái (Toàn team)
          </h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={150}
                  tick={{ fontSize: 11, fill: '#0F172A' }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} ticket`, 'Số lượng']}
                  contentStyle={{ borderRadius: '8px', borderColor: '#E2E8F0', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#0D9488" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Summary Table (Accessible Fallback & Exact Counts) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Bảng tổng hợp trạng thái</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {chartData.map((row) => (
              <Link
                key={row.status}
                to={`/tickets?status=${row.status}`}
                className="flex min-h-[44px] items-center justify-between gap-2 py-2 text-sm hover:bg-slate-50"
              >
                <span className="text-slate-700">{row.label}</span>
                <span className="font-mono-code rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-900">
                  {row.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Per-Staff Breakdown Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Thống kê Task theo từng nhân sự
            </h2>
            <p className="text-xs text-slate-500">
              Nhấn vào nhân sự để lọc danh sách công việc được giao cho nhân sự đó.
            </p>
          </div>
        </div>

        {stats.byStaff.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Chưa có nhân sự nào được giao việc.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-3 py-2.5 font-semibold">Nhân sự</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Tổng</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-amber-800">
                    Overdue
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold">Chờ xử lý</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Chờ Listing</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Chờ GoLive</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Chờ kiểm tra</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Đã đóng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stats.byStaff.map((staff) => {
                  const pendingPd =
                    staff.byStatus.PENDING_PD_CHECK +
                    staff.byStatus.PENDING_GOLIVE_APPROVAL +
                    staff.byStatus.PENDING_CLOSE;
                  return (
                    <tr key={staff.uid} className="hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <Link
                          to={`/tickets?assignee=${staff.uid}`}
                          className="flex items-center gap-2.5 font-medium text-slate-900 hover:text-teal-700"
                        >
                          <UserAvatar
                            name={staff.displayName}
                            avatarDataUrl={staff.avatarDataUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{staff.displayName}</div>
                            <div className="truncate text-[11px] text-slate-500">{staff.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="font-mono-code px-3 py-3 text-center font-bold text-slate-900">
                        {staff.total}
                      </td>
                      <td className="font-mono-code px-3 py-3 text-center">
                        {staff.overdue > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                            {staff.overdue}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="font-mono-code px-3 py-3 text-center">
                        {staff.byStatus.WAITING_OM}
                      </td>
                      <td className="font-mono-code px-3 py-3 text-center">
                        {staff.byStatus.WAITING_LISTING}
                      </td>
                      <td className="font-mono-code px-3 py-3 text-center">
                        {staff.byStatus.WAITING_GOLIVE}
                      </td>
                      <td className="font-mono-code px-3 py-3 text-center">{pendingPd}</td>
                      <td className="font-mono-code px-3 py-3 text-center font-semibold text-emerald-700">
                        {staff.byStatus.CLOSED}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Priority Open Tasks */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            Công việc ưu tiên (Overdue &amp; Sắp đến hạn)
          </h2>
          <Link to="/tickets" className="text-xs font-semibold text-teal-700 hover:underline">
            Xem tất cả
          </Link>
        </div>

        {priorityTasks.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Hiện không có task nào đang mở.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {priorityTasks.map((t) => {
              const overdue = isTicketOverdue(t, nowMs);
              return (
                <Link
                  key={t.id}
                  to={`/tickets/${t.id}`}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-3 transition hover:bg-slate-50 ${
                    overdue ? 'bg-amber-50/70' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono-code text-xs font-bold text-teal-700">
                        {t.code}
                      </span>
                      <TicketGroupBadge groupType={t.groupType} />
                      {overdue && <OverdueBadge />}
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {t.title}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="text-right">
                      <div className="font-mono-code flex items-center gap-1 text-xs text-slate-600">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{formatVietnamDateTime(t.deadline)}</span>
                      </div>
                      {overdue && (
                        <div className="text-[11px] font-semibold text-amber-800">
                          {formatOverdueDuration(t.deadline, nowMs)}
                        </div>
                      )}
                    </div>
                    <TicketStatusBadge status={t.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
