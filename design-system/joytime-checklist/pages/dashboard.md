# Page Spec: Dashboard & Thống kê (`dashboard`)

> Overrides/extends [MASTER.md](../MASTER.md)

## 1. Role-Scoped Views
- **PD (Cấp quản lý)**:
  - Top KPI Strip (4 cards on Desktop `grid-cols-4`, `2×2` grid on Mobile):
    1. `Tổng Task đang mở`
    2. `Chờ PD kiểm tra / duyệt` (highlighted with `#0D9488` / `#EDE9FE`)
    3. `Đang trễ hạn (Overdue)` (highlighted with Warning `#FEF3C7` border `#F59E0B` + `AlertTriangle` icon + clickable quick-filter)
    4. `Đã đóng`
  - **Biểu đồ phân bổ trạng thái toàn team** (Grouped / Stacked Horizontal Bar Chart + tabular breakdown toggle).
  - **Bảng hiệu suất theo từng nhân sự OM**: Hàng = từng `OM` (Avatar + Tên), Cột = số task theo từng trạng thái + cột `Overdue` warning nổi bật. Nhấn vào tên/số sẽ chuyển sang danh sách lọc đúng nhân sự & trạng thái đó.
- **OM (Cấp thực hiện)**:
  - Top KPI Strip (cá nhân): `Cần làm`, `Chờ PD duyệt`, `Chờ GoLive` (nếu có), `Quá hạn (Overdue)`.
  - Danh sách ưu tiên **"Việc cần xử lý ngay"** (ưu tiên Overdue lên đầu, sau đó sắp xếp theo Deadline gần nhất).
  - Không hiển thị bảng/biểu đồ của nhân sự khác.

## 2. Chart & Data Rules
- Chart library: **Chart.js** or **Recharts** (lightweight SVG/Canvas) with clear data labels inside/beside bars.
- Always pair chart with a clean summary table below/toggled for exact numeric reading on narrow mobile screens (`375px`).
