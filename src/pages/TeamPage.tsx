import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Mail, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveAppConfig, subscribeAppConfig, updateMemberRole } from '../services/userService';
import type { UserProfile, UserRole } from '../types/user';
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

  useEffect(() => {
    const unsub = subscribeAppConfig((cfg) => {
      setPdInviteCode(cfg.pdInviteCode);
      setBootstrapEmails(cfg.bootstrapPdEmails.join(', '));
      setGasWebhookUrl(cfg.gasWebhookUrl);
      setGasSharedSecret(cfg.gasSharedSecret);
    });
    return unsub;
  }, []);

  if (!userProfile || userProfile.role !== 'PD') return null;

  const pdCount = users.filter((u) => u.role === 'PD').length;

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleToggleRole = async (target: UserProfile) => {
    const nextRole: UserRole = target.role === 'PD' ? 'OM' : 'PD';
    if (target.uid === userProfile.uid && nextRole === 'OM' && pdCount <= 1) {
      window.alert('Không thể tự hạ quyền vì bạn là PD duy nhất còn lại trong hệ thống.');
      return;
    }
    const ok = window.confirm(
      `Xác nhận chuyển vai trò của "${target.displayName}" từ ${target.role} sang ${nextRole}?`
    );
    if (!ok) return;

    await updateMemberRole(target.uid, nextRole);
    setFeedback(`Đã cập nhật vai trò của ${target.displayName} thành ${nextRole}.`);
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
      setFeedback('Đã lưu cấu hình mã mời PD và Google Apps Script gửi email.');
    } finally {
      setSavingCfg(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
          Quản lý Nhân sự &amp; Cấu hình Hệ thống
        </h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Cấp hoặc thu hồi vai trò PD / OM và cấu hình webhook gửi email Google Apps Script.
        </p>
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
            <option value="ALL">Tất cả vai trò ({users.length})</option>
            <option value="PD">PD · Quản lý</option>
            <option value="OM">OM · Thực hiện</option>
          </select>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredUsers.map((member) => {
            const isOnlyPdSelf = member.uid === userProfile.uid && member.role === 'PD' && pdCount <= 1;
            return (
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
                  disabled={isOnlyPdSelf}
                  onClick={() => handleToggleRole(member)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  <span>{member.role === 'PD' ? 'Hạ xuống OM' : 'Nâng lên PD'}</span>
                </button>
              </div>
            );
          })}
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
            Cấu hình Mã mời PD &amp; Email Webhook (Google Apps Script)
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="cfg-invite" className="block text-sm font-medium text-slate-800">
              Mã mời đăng ký PD
            </label>
            <input
              id="cfg-invite"
              type="text"
              value={pdInviteCode}
              onChange={(e) => setPdInviteCode(e.target.value)}
              placeholder="VD: JOYTIME-PD-2026"
              className="font-mono-code mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="cfg-bootstrap" className="block text-sm font-medium text-slate-800">
              Email tự động nhận quyền PD (cách nhau dấu phẩy)
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
    </div>
  );
}
