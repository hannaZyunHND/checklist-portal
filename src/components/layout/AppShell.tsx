import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  CheckSquare,
  ClipboardList,
  LayoutDashboard,
  Plus,
  UserCircle2,
  Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RoleBadge } from '../ui/StatusBadge';
import { UserAvatar } from '../ui/UserAvatar';

interface AppShellProps {
  children: React.ReactNode;
  overdueCount?: number;
  onOpenCreateTicket?: () => void;
}

export function AppShell({ children, overdueCount = 0, onOpenCreateTicket }: AppShellProps) {
  const { userProfile } = useAuth();
  if (!userProfile) return null;

  const isManager = userProfile.role === 'MANAGER';

  const navItems = [
    { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
    { to: '/tickets', label: 'Công việc', icon: ClipboardList, end: false },
    ...(isManager ? [{ to: '/team', label: 'Tài khoản', icon: Users, end: false }] : []),
    { to: '/profile', label: 'Hồ sơ', icon: UserCircle2, end: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Left Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
            <CheckSquare className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900">Joytime Checklist</div>
            <div className="text-[11px] text-slate-500">Kiểm soát Task Team</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Điều hướng chính">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 border border-teal-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={userProfile.displayName}
              avatarDataUrl={userProfile.avatarDataUrl}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">
                {userProfile.displayName}
              </div>
              <div className="mt-0.5">
                <RoleBadge role={userProfile.role} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-h-screen flex-col lg:pl-60">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:h-16 lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
              <CheckSquare className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-bold text-slate-900">Joytime</span>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-xs font-medium text-slate-500">
              {isManager
                ? 'Tài khoản Quản lý · Tạo/sửa tài khoản & quản lý task'
                : 'Tài khoản Nhân viên · Tạo, xem & xử lý task'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {overdueCount > 0 && (
              <NavLink
                to="/tickets?overdue=1"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-amber-500 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-200"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                <span>{overdueCount} Quá hạn</span>
              </NavLink>
            )}

            {onOpenCreateTicket && (
              <button
                type="button"
                onClick={onOpenCreateTicket}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Tạo Ticket</span>
                <span className="sm:hidden">Tạo</span>
              </button>
            )}
          </div>
        </header>

        <main className="safe-bottom-pad flex-1 px-4 py-5 lg:px-6 lg:py-6 lg:pb-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <nav
        aria-label="Điều hướng di động"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className={`grid ${isManager ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium transition ${
                    isActive ? 'text-teal-700' : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
