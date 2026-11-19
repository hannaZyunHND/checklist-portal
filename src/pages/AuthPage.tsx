import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, CheckSquare, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loginAccount, mapAuthErrorMessage, registerAccount } from '../services/authService';

export function AuthPage() {
  const { firebaseUser, userProfile, loading, isConfigured } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pdInviteCode, setPdInviteCode] = useState('');
  const [showInviteField, setShowInviteField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && firebaseUser && userProfile) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isConfigured) {
      setError('Ứng dụng chưa được cấu hình Firebase (.env). Vui lòng xem README.md để điền VITE_FIREBASE_*');
      return;
    }

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (mode === 'register') {
      if (!displayName.trim()) {
        setError('Vui lòng nhập tên hiển thị.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await loginAccount(email, password);
      } else {
        await registerAccount({
          email,
          password,
          displayName,
          pdInviteCode: showInviteField ? pdInviteCode : '',
        });
      }
    } catch (err) {
      setError(mapAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-[440px] rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
            <CheckSquare className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Joytime Checklist</h1>
            <p className="text-xs text-slate-600">Quản lý &amp; kiểm soát tiến độ công việc Team</p>
          </div>
        </div>

        {!isConfigured && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-amber-400 bg-amber-50 p-3 text-xs text-amber-900"
          >
            <strong>Chưa cấu hình Firebase:</strong> Hãy tạo file <code>.env.local</code> từ{' '}
            <code>.env.example</code> để kết nối Firebase Auth &amp; Firestore Free.
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`min-h-[44px] rounded-lg text-sm font-semibold transition ${
              mode === 'login' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`min-h-[44px] rounded-lg text-sm font-semibold transition ${
              mode === 'register' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600'
            }`}
          >
            Đăng ký
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium text-slate-800">
                Tên hiển thị <span className="text-red-600">*</span>
              </label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="VD: Nguyễn Minh"
                className="mt-1.5 min-h-[48px] w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-slate-800">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@congty.com"
              className="mt-1.5 min-h-[48px] w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-slate-800">
              Mật khẩu <span className="text-red-600">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                className="min-h-[48px] w-full rounded-lg border border-slate-300 pr-12 pl-3 py-2 text-base text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label htmlFor="auth-confirm" className="block text-sm font-medium text-slate-800">
                  Xác nhận mật khẩu <span className="text-red-600">*</span>
                </label>
                <input
                  id="auth-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="mt-1.5 min-h-[48px] w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">
                  Mặc định tài khoản tự đăng ký là <strong>Nhân viên</strong>. Nếu bạn là{' '}
                  <strong>Quản lý</strong>, hãy nhập mã mời Quản lý hoặc nhờ Quản lý nâng quyền.
                </p>
                <button
                  type="button"
                  onClick={() => setShowInviteField((v) => !v)}
                  className="mt-1.5 text-xs font-semibold text-teal-700 underline"
                >
                  {showInviteField ? 'Ẩn ô mã mời Quản lý' : 'Tôi có mã mời Quản lý'}
                </button>
                {showInviteField && (
                  <input
                    type="text"
                    value={pdInviteCode}
                    onChange={(e) => setPdInviteCode(e.target.value)}
                    placeholder="Nhập mã mời Quản lý (tùy chọn)"
                    className="mt-2 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                )}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            <span>{mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
