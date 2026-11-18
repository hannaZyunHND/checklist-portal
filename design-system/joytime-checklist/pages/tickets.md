# Page Spec: Danh sách & Bộ lọc Ticket (`tickets`)

> Overrides/extends [MASTER.md](../MASTER.md)

## 1. Filter & Action Header
- **Desktop**:
  - Top action bar: Search input (`Id`, `Title`, `SKU`), Filter `Nhóm việc` (Tất cả | Chỉnh sửa SP cũ | Listing SP mới | Công việc VP), Filter `Trạng thái`, Filter `Nhân sự` (chỉ hiện với `PD`), Toggle chip `Chỉ hiện Overdue` (Warning `#FEF3C7` / `#F59E0B`).
  - Primary CTA (chỉ hiện với `PD`): `+ Tạo Ticket mới` (`--color-accent` `#EA580C`, white text).
- **Mobile (`375px–767px`)**:
  - Search bar + `Bộ lọc` button (hiển thị badge số filter đang bật) mở **Bottom Sheet Filter Drawer**.
  - Quick horizontal filter pills (`Tất cả`, `Quá hạn`, `Chờ tôi xử lý`) với `flex-wrap`.
  - Floating / Header CTA `+ Tạo` cho `PD` đạt chuẩn `>=44×44px`.

## 2. List Presentation
- **Desktop (`>=1024px`) — Data Table**:
  - Columns: `Mã ID` (`Fira Code`), `Nhóm việc` (badge), `Tiêu đề & SKU/Thông tin ngắn`, `Nhân sự được giao` (Avatar stack + tiến độ `k/N` cho Nhóm III), `Deadline` (kèm tag `Quá hạn X ngày` màu warning nếu Overdue), `Trạng thái` (badge + icon), `Thao tác nhanh`.
  - Overdue rows get a subtle `#FFFBEB` row tint + `3px` left border `#F59E0B`.
- **Mobile (`<1024px`) — Ticket Cards**:
  - Row 1: `Mã ID` (`Fira Code`) + `Nhóm việc` pill + `Overdue` warning pill (nếu trễ hạn).
  - Row 2: `Tiêu đề` (tối đa 2 dòng, bold).
  - Row 3: `SKU` / `SKU dự kiến` (nếu có) hoặc tiến độ nhóm (`2/3 hoàn thành`).
  - Row 4: Avatar + Tên nhân sự | `Deadline` | `Trạng thái` badge.

## 3. Create Ticket Modal / Drawer (PD Only)
- Chọn `Nhóm việc` bằng 3 segmented cards rõ ràng (`Chỉnh sửa SP cũ` | `Listing SP mới` | `Công việc văn phòng`).
- Form fields tự động hiển thị đúng các trường cố định:
  - Nhóm I: `Title(*)`, `SKU sản phẩm cần kiểm tra(*)`, `Yêu cầu chỉnh sửa(*)`, `Deadline(*)`, `Nhân sự được giao (Chọn 1 OM)(*)`.
  - Nhóm II: `Title(*)`, `Thông tin sản phẩm cơ bản(*)`, `Yêu cầu bổ sung`, `Deadline(*)`, `Nhân sự được giao (Chọn 1 OM)(*)`.
  - Nhóm III: `Title(*)`, `Yêu cầu(*)`, `Deadline(*)`, `Các nhân sự được giao (Multi-select ≥1 OM)(*)`.
- Validate inline + focusable error summary khi thiếu trường bắt buộc.
