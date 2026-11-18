# Page Spec: Chi tiết Ticket & Timeline Lịch sử (`ticket-detail`)

> Overrides/extends [MASTER.md](../MASTER.md)

## 1. Layout Structure
- **Desktop**: Split 2-column layout (2/3 Main Ticket Info & Action Panel | 1/3 Vertical Status History Timeline) — hoặc Slide-over Drawer rộng (`820px`).
- **Mobile**: Single-column stacked view với Sticky Bottom Action Bar (`--color-card` + top border) chứa nút hành động chính theo quyền & trạng thái hiện tại.

## 2. Header, Stepper & Overdue Banner
- Hiển thị `Mã ID`, `Nhóm việc`, `Trạng thái hiện tại` kèm Stepper trực quan:
  - Nhóm I: `1. Tạo & Giao` → `2. OM Thực hiện` → `3. PD Kiểm tra` → `4. Đóng`.
  - Nhóm II: `1. Tạo & Giao` → `2. OM Listing (SKU)` → `3. PD Duyệt GoLive` → `4. OM GoLive (URL)` → `5. PD Kiểm tra & Đóng`.
  - Nhóm III: `1. Tạo & Giao` → `2. OM Thực hiện (k/N)` → `3. PD Kiểm tra` → `4. Đóng`.
- Nếu `Overdue`: Hiển thị Warning Banner (`#FEF3C7` / `#92400E` / `#F59E0B`) ngay dưới tiêu đề: `"Ticket đã quá hạn [X giờ/ngày] so với Deadline [DD/MM/YYYY HH:mm]"`.

## 3. Role-Specific Action Panels (Clarified Workflows)
- **Nhóm I (`Chỉnh sửa sản phẩm cũ`)**:
  - `OM` (`WAITING_OM`): Ô `Ghi chú hoàn thành (tùy chọn)` + Nút `Tích hoàn thành`.
  - `PD` (`PENDING_PD_CHECK`): 2 nút (`gap-3`): `Yêu cầu làm lại` (Outline/Destructive `#DC2626`, bắt buộc nhập lý do) và `Xác nhận & Đóng ticket` (Primary `#0D9488`).
- **Nhóm II (`Listing sản phẩm mới`)**:
  - `OM` (`WAITING_LISTING`): Input bắt buộc `SKU dự kiến (*)` + Ghi chú tùy chọn + Nút `Hoàn thành Listing`.
  - `PD` (`PENDING_GOLIVE_APPROVAL`): Hiển thị nổi bật `SKU dự kiến` bằng `Fira Code` + 2 nút: `Từ chối / Làm lại Listing` (bắt buộc nhập lý do, đưa về `WAITING_LISTING`) và `Xác nhận Golive sản phẩm` (`--color-accent` `#EA580C`).
  - `OM` (`WAITING_GOLIVE`): Input bắt buộc `URL sản phẩm (*)` (validate `https://...`) + Nút `Gửi URL hoàn tất GoLive` (chuyển sang `PENDING_CLOSE`).
  - `PD` (`PENDING_CLOSE`): Hiển thị clickable `URL sản phẩm` mở tab mới + 2 nút: `Không đạt / Quay lại bước GoLive` (bắt buộc nhập lý do, đưa về `WAITING_GOLIVE`) và `Xác nhận & Đóng ticket` (Primary `#0D9488`).
- **Nhóm III (`Công việc văn phòng`)**:
  - Hiển thị Checklist từng nhân sự (`Avatar + Tên + Đã xong lúc ... / Chưa xong`) kèm thanh tiến độ `k/N`.
  - `OM` được giao (`WAITING_OM`): Nút `Tích hoàn thành phần của tôi` nếu bản thân chưa tích (hiển thị trạng thái `Bạn đã hoàn thành, đang chờ đồng đội` nếu đã tích).
  - `PD` (`PENDING_PD_CHECK` khi `N/N` xong):
    - Nút `Xác nhận & Đóng ticket` (`#0D9488`).
    - Nút `Yêu cầu làm lại`: Mở danh sách checkbox chọn **đích danh 1 hoặc nhiều nhân sự** cần làm lại + ô `Lý do làm lại (*)`. Các nhân sự không bị chọn giữ nguyên trạng thái đã hoàn thành.

## 4. Lịch sử Thay đổi Trạng thái (Audit Timeline)
- Vertical timeline hiển thị rõ từng lần chuyển trạng thái:
  - Avatar + Tên người thực hiện (`PD` / `OM` badge) + Thời gian (`DD/MM/YYYY HH:mm:ss`).
  - Transition chip: `[Trạng thái cũ] → [Trạng thái mới]`.
  - Dữ liệu đính kèm (`SKU dự kiến`, `URL sản phẩm`, `Lý do làm lại`, danh sách nhân sự làm lại ở Nhóm III, ghi chú) hiển thị trong khung muted.
- Nếu lần gửi email của bước gần nhất bị lỗi (`FAILED`), hiện tag nhỏ kèm nút `Thử gửi lại email` cho `PD`.
