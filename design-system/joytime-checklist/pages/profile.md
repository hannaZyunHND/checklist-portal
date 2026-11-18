# Page Spec: Hồ sơ cá nhân (`profile`)

> Overrides/extends [MASTER.md](../MASTER.md)

## 1. Profile Card
- Avatar preview tròn (`80×80px`) với nút `Đổi Avatar`:
  - Hỗ trợ tải ảnh lên (tự động nén/resize client-side <= 100KB để tương thích gói database miễn phí) hoặc chọn bộ avatar mặc định / nhập URL ảnh.
- Thông tin hiển thị:
  - `Tên hiển thị (*)` (editable)
  - `Email` (read-only)
  - `Vai trò` (`PD - Cấp quản lý` hoặc `OM - Cấp thực hiện`, read-only badge)
- Nút `Lưu thay đổi` (`--color-primary`, disable khi chưa có chỉnh sửa hoặc đang lưu).

## 2. Mobile & Account Actions
- Nút `Đăng xuất` tách biệt rõ ràng bên dưới với màu trung tính/outline, touch target `>=44px` và xác nhận nhẹ tránh bấm nhầm.
