import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Mail, Pencil, Search, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mapAuthErrorMessage } from '../services/authService';
import {
  adminCreateUserAccount,
  adminUpdateUserAccount,
  saveAppConfig,
  subscribeAppConfig,
} from '../services/userService';
import {
  ACCOUNT_ROLE_LABELS,
  type UserProfile,
  type UserRole,
} from '../types/user';
import { ModalOrSheet } from '../components/ui/ModalOrSheet';
import { RoleBadge } from '../components/ui/StatusBadge';
import { UserAvatar } from '../components/ui/UserAvatar';

export function TeamPage({ users }: { users: UserProfile[] }) {
  const { userProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [pdInviteCode, setPdInviteCode] = useState('');
  const [bootstrapEmails, setBootstrapEmails] = useState('');
  const [gasWebhookUrl, setGasWebhookUrl] = useState('');
  const [gasSharedSecret, setGasSharedSecret] = useState('');
  const [savingCfg, setSavingCfg] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Create Account Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('STAFF');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit Account Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('STAFF');
  const [savingUser, setSavingUser] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    const unsub = subscribeAppConfig((cfg) => {
      setPdInviteCode(cfg.pdInviteCode);
      setBootstrapEmails(cfg.bootstrapPdEmails.join(', '));
      setGasWebhookUrl(cfg.gasWebhookUrl);
      setGasSharedSecret(cfg.gasSharedSecret);
    });
    return unsub;
  }, []);

  if (!userProfile || userProfile.role !== 'MANAGER') return null;

  const managerCount = users.filter((u) => u.role === 'MANAGER').length;

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const openEditModal = (member: UserProfile) => {
    setEditingUser(member);
    setEditName(member.displayName);
    setEditRole(member.role);
    setEditError('');
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreatingUser(true);
    try {
      const created = await adminCreateUserAccount({
        displayName: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      setCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('STAFF');
      setFeedback(`Đã tạo tài khoản "${created.displayName}" (${ACCOUNT_ROLE_LABELS[created.role]}) thành công.`);
    } catch (err) {
      setCreateError(mapAuthErrorMessage(err));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');

    if (
      editingUser.uid === userProfile.uid &&
      editingUser.role === 'MANAGER' &&
      editRole !== 'MANAGER' &&
      managerCount <= 1
    ) {
      setEditError('Không thể tự hạ quyền vì bạn là Quản lý duy nhất còn lại trong hệ thống.');
      return;
    }

    setSavingUser(true);
    try {
      await adminUpdateUserAccount(editingUser.uid, {
        displayName: editName,
        role: editRole,
      });
      setFeedback(`Đã cập nhật thông tin tài khoản "${editName}".`);
      setEditingUser(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Không thể cập nhật tài khoản.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCfg(true);
    setFeedback('');
    try {
      await saveAppConfig({
        pdInviteCode: pdInviteCode.trim(),
        bootstrapPdEmails: bootstrapEmails
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
        gasWebhookUrl: gasWebhookUrl.trim(),
        gasSharedSecret: gasSharedSecret.trim(),
      });
      setFeedback('Đã lưu cấu hình mã mời Quản lý và Google Apps Script gửi email.');
    } finally {
      setSavingCfg(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
            Quản lý Tài khoản &amp; Cấu hình Hệ thống
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Tạo/sửa tài khoản Quản lý &amp; Nhân viên và cấu hình Email Webhook.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError('');
            setCreateOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          <span>Tạo tài khoản mới</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-sm text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Member Directory */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên hoặc email nhân sự..."
              className="min-h-[44px] w-full rounded-lg border border-slate-300 pr-3 pl-9 text-sm"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="ALL">Tất cả tài khoản ({users.length})</option>
            <option value="MANAGER">Quản lý</option>
            <option value="STAFF">Nhân viên</option>
          </select>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredUsers.map((member) => (
            <div
              key={member.uid}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={member.displayName}
                  avatarDataUrl={member.avatarDataUrl}
                  size="md"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {member.displayName}
                    </span>
                    <RoleBadge role={member.role} />
                  </div>
                  <div className="text-xs text-slate-500">{member.email}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openEditModal(member)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
                <span>Sửa tài khoản</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* System Config Card */}
      <form
        onSubmit={handleSaveConfig}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-teal-700" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">
            Cấu hình Mã mời Quản lý &amp; Email Webhook (Google Apps Script)
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="cfg-invite" className="block text-sm font-medium text-slate-800">
              Mã mời đăng ký Quản lý
            </label>
            <input
              id="cfg-invite"
              type="text"
              value={pdInviteCode}
              onChange={(e) => setPdInviteCode(e.target.value)}
              placeholder="VD: JOYTIME-MGR-2026"
              className="font-mono-code mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="cfg-bootstrap" className="block text-sm font-medium text-slate-800">
              Email tự động nhận quyền Quản lý (cách nhau dấu phẩy)
            </label>
            <input
              id="cfg-bootstrap"
              type="text"
              value={bootstrapEmails}
              onChange={(e) => setBootstrapEmails(e.target.value)}
              placeholder="minh@joytime.vn, manager@joytime.vn"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
          <div>
            <label htmlFor="cfg-gas-url" className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Mail className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Google Apps Script Web App URL</span>
            </label>
            <input
              id="cfg-gas-url"
              type="url"
              value={gasWebhookUrl}
              onChange={(e) => setGasWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="cfg-gas-secret" className="block text-sm font-medium text-slate-800">
              Google Apps Script Shared Secret
            </label>
            <input
              id="cfg-gas-secret"
              type="password"
              value={gasSharedSecret}
              onChange={(e) => setGasSharedSecret(e.target.value)}
              placeholder="Khớp với SHARED_SECRET trong gas/Code.gs"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingCfg}
            className="min-h-[44px] rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {savingCfg ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </form>

      {/* Modal: Create Account */}
      <ModalOrSheet
        open={createOpen}
        onClose={() => !creatingUser && setCreateOpen(false)}
        title="Tạo tài khoản nhân sự mới"
        subtitle="Tạo trực tiếp mà không làm đăng xuất phiên hiện tại của bạn"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          {createError && (
            <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-800">
              Tên hiển thị <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800">
              Email đăng nhập <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nhanvien@congty.com"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800">
              Mật khẩu ban đầu <span className="text-red-600">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800">Quyền tài khoản</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="STAFF">Nhân viên</option>
              <option value="MANAGER">Quản lý</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={creatingUser}
              onClick={() => setCreateOpen(false)}
              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creatingUser}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {creatingUser && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              <span>Tạo tài khoản</span>
            </button>
          </div>
        </form>
      </ModalOrSheet>

      {/* Modal: Edit Account */}
      <ModalOrSheet
        open={Boolean(editingUser)}
        onClose={() => !savingUser && setEditingUser(null)}
        title="Chỉnh sửa tài khoản"
        subtitle={editingUser?.email}
      >
        <form onSubmit={handleSaveEditUser} className="space-y-4">
          {editError && (
            <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {editError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-800">
              Tên hiển thị <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800">Quyền tài khoản</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="STAFF">Nhân viên</option>
              <option value="MANAGER">Quản lý</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={savingUser}
              onClick={() => setEditingUser(null)}
              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={savingUser}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {savingUser && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </ModalOrSheet>
    </div>
  );
}
