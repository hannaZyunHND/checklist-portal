# Page Spec: Authentication & Onboarding (`auth`)

> Overrides/extends [MASTER.md](../MASTER.md)

## 1. Layout & Responsiveness
- **Desktop (`>=1024px`)**: Centered clean auth card (`max-width: 440px`) on `#F8FAFC` canvas with Joytime Checklist brand header and crisp 1px border (`#E2E8F0`).
- **Mobile (`375px+`)**: Full-width card with `16px` horizontal padding, `48px` input height (`font-size: 16px` to prevent iOS auto-zoom).

## 2. Tabs & Modes
- Segmented tab switcher at card top: **Đăng nhập** | **Đăng ký**.
- **Đăng nhập**:
  - `Email (*)` (`type="email"`, `autocomplete="email"`).
  - `Mật khẩu (*)` (`type="password"` with show/hide eye toggle button `44×44px`).
  - Submit CTA: `Đăng nhập` (`--color-primary`).
- **Đăng ký**:
  - `Tên hiển thị (*)`
  - `Email (*)`
  - `Mật khẩu (*)` & `Xác nhận mật khẩu (*)`
  - `Mã mời PD (Tùy chọn)` — Ô thu gọn/tùy chọn với chú thích rõ: *"Mặc định tài khoản mới là Nhân sự thực hiện (OM). Nhập mã mời nếu bạn là Quản lý (PD), hoặc liên hệ PD hiện có để được cấp quyền sau khi đăng ký."*

## 3. Accessibility & UX Rules
- Allow password managers and paste into password fields.
- On auth failure (wrong password, invalid invite code, existing email), render a clear `role="alert"` inline banner above the form without clearing the entered email.
