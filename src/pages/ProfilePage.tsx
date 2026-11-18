import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, LogOut, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  compressAvatarFile,
  logoutAccount,
  PRESET_AVATARS,
  updateUserProfileInfo,
} from '../services/authService';
import { RoleBadge } from '../components/ui/StatusBadge';
import { UserAvatar } from '../components/ui/UserAvatar';

export function ProfilePage() {
  const { userProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [avatarDataUrl, setAvatarDataUrl] = useState(userProfile?.avatarDataUrl || '');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setAvatarDataUrl(userProfile.avatarDataUrl || '');
      if (userProfile.avatarDataUrl?.startsWith('http')) {
        setImageUrlInput(userProfile.avatarDataUrl);
      }
    }
  }, [userProfile]);

  if (!userProfile) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setCompressing(true);
    try {
      const compressed = await compressAvatarFile(file);
      setAvatarDataUrl(compressed);
      setImageUrlInput('');
      setMessage({ type: 'ok', text: 'Đã nén ảnh avatar sẵn sàng. Nhấn "Lưu thay đổi" để cập nhật.' });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Không thể xử lý ảnh.',
      });
    } finally {
      setCompressing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      await updateUserProfileInfo(userProfile.uid, {
        displayName,
        avatarDataUrl,
      });
      setMessage({ type: 'ok', text: 'Đã cập nhật thông tin tài khoản thành công.' });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Không thể lưu thay đổi.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất khỏi Joytime Checklist?')) {
      await logoutAccount();
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Hồ sơ cá nhân</h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Cập nhật tên hiển thị và ảnh đại diện của bạn.
        </p>
      </div>

      {message && (
        <div
          role={message.type === 'err' ? 'alert' : 'status'}
          className={`flex items-center gap-2 rounded-xl border p-3.5 text-sm ${
            message.type === 'ok'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-red-300 bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'ok' && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
          <span>{message.text}</span>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 md:p-6"
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <UserAvatar name={displayName || userProfile.email} avatarDataUrl={avatarDataUrl} size="lg" />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                {compressing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{compressing ? 'Đang nén ảnh...' : 'Tải ảnh lên'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              {avatarDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarDataUrl('');
                    setImageUrlInput('');
                  }}
                  className="min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Xóa ảnh
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Ảnh tải lên sẽ tự động nén ≤ 80KB để tối ưu tốc độ trên gói Firebase Free.
            </p>
          </div>
        </div>

        {/* Preset Avatars */}
        <div>
          <div className="text-xs font-medium text-slate-600">Hoặc chọn màu Avatar mặc định:</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_AVATARS.map((preset) => {
              const value = `preset:${preset.id}`;
              const active = avatarDataUrl === value;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setAvatarDataUrl(value);
                    setImageUrlInput('');
                  }}
                  aria-label={`Chọn avatar màu ${preset.label}`}
                  style={{ backgroundColor: preset.bg }}
                  className={`h-10 w-10 rounded-full border-2 transition ${
                    active ? 'border-slate-900 ring-2 ring-teal-500' : 'border-white'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* URL fallback */}
        <div>
          <label htmlFor="profile-avatar-url" className="block text-xs font-medium text-slate-600">
            Hoặc dán URL ảnh đại diện (tùy chọn)
          </label>
          <input
            id="profile-avatar-url"
            type="url"
            value={imageUrlInput}
            onChange={(e) => {
              setImageUrlInput(e.target.value);
              if (e.target.value.trim()) {
                setAvatarDataUrl(e.target.value.trim());
              }
            }}
            placeholder="https://..."
            className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label htmlFor="profile-name" className="block text-sm font-medium text-slate-800">
            Tên hiển thị <span className="text-red-600">*</span>
          </label>
          <input
            id="profile-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 md:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">Email đăng nhập</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{userProfile.email}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Vai trò hiện tại</div>
            <div className="mt-1">
              <RoleBadge role={userProfile.role} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>

          <button
            type="submit"
            disabled={saving || compressing}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
