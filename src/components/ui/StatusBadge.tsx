import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileEdit,
  FolderKanban,
  PackagePlus,
  Rocket,
} from 'lucide-react';
import {
  TICKET_GROUP_SHORT_LABELS,
  TICKET_STATUS_LABELS,
  type TicketGroupType,
  type TicketStatus,
} from '../../types/ticket';
import type { UserRole } from '../../types/user';

const STATUS_STYLE: Record<
  TicketStatus,
  { bg: string; text: string; border: string; Icon: typeof Clock }
> = {
  WAITING_OM: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-300',
    Icon: Clock,
  },
  WAITING_LISTING: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-300',
    Icon: Clock,
  },
  PENDING_PD_CHECK: {
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    border: 'border-violet-300',
    Icon: Eye,
  },
  PENDING_GOLIVE_APPROVAL: {
    bg: 'bg-violet-50',
    text: 'text-violet-800',
    border: 'border-violet-300',
    Icon: Eye,
  },
  WAITING_GOLIVE: {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-300',
    Icon: Rocket,
  },
  PENDING_CLOSE: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-300',
    Icon: Eye,
  },
  CLOSED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    Icon: CheckCircle2,
  },
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { bg, text, border, Icon } = STATUS_STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${bg} ${text} ${border}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{TICKET_STATUS_LABELS[status]}</span>
    </span>
  );
}

const GROUP_STYLE: Record<TicketGroupType, { bg: string; text: string; Icon: typeof FileEdit }> = {
  EDIT_OLD: { bg: 'bg-slate-100', text: 'text-slate-700', Icon: FileEdit },
  NEW_LISTING: { bg: 'bg-emerald-50', text: 'text-emerald-800', Icon: PackagePlus },
  OFFICE: { bg: 'bg-blue-50', text: 'text-blue-800', Icon: FolderKanban },
};

export function TicketGroupBadge({ groupType }: { groupType: TicketGroupType }) {
  const { bg, text, Icon } = GROUP_STYLE[groupType];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${bg} ${text}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{TICKET_GROUP_SHORT_LABELS[groupType]}</span>
    </span>
  );
}

export function OverdueBadge({ label = 'Quá hạn' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-500 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  return role === 'PD' ? (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-teal-300 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">
      PD · Quản lý
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      OM · Thực hiện
    </span>
  );
}
