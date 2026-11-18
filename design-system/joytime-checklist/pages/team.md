# Page Spec: Quản lý Nhân sự & Phân quyền (`team`)

> Overrides/extends [MASTER.md](../MASTER.md) — **PD Only**

## 1. Access Control
- Chỉ hiển thị trên Sidebar (Desktop) và Navigation menu (Mobile) đối với tài khoản có vai trò `PD`.
- Nếu `OM` truy cập trực tiếp URL `/team`, điều hướng về `/` (Dashboard) kèm thông báo không có quyền truy cập.

## 2. Layout & Components
- **Header**: Tiêu đề `Quản lý nhân sự & Vai trò`, ô tìm kiếm nhanh theo tên/email, bộ lọc `Tất cả | PD | OM`.
- **Cấu hình mã mời PD (Collapsible Card)**:
  - Hiển thị/cập nhật `Mã mời PD` để thành viên mới khi đăng ký có thể vào thẳng vai trò `PD` nếu được cung cấp mã.
- **Danh sách thành viên**:
  - Desktop: Bảng hiển thị `Avatar + Tên hiển thị`, `Email`, `Vai trò hiện tại` (badge `PD` hoặc `OM`), `Ngày tham gia`, `Thao tác chuyển vai trò`.
  - Mobile: Card list từng thành viên với nút `Chuyển thành PD` / `Chuyển thành OM` (`>=44px` touch target).
- **Guardrails**:
  - Không cho phép `PD` tự hạ quyền của chính mình nếu là `PD` duy nhất còn lại trong hệ thống (hiển thị tooltip/cảnh báo giải thích).
  - Yêu cầu hộp thoại xác nhận nhẹ trước khi nâng/hạ vai trò của người khác.
