# Feature Specification: Hệ thống Kiểm soát Task Công việc (Joytime Checklist)

**Feature Branch**: `001-ticket-task-control`

**Created**: 2026-11-18

**Status**: Clarified

**Input**: User description: "Web-app tối ưu cho máy tính và mobile với nhiệm vụ kiểm soát các task công việc. 2 phân quyền chính PD (Cấp quản lý) và OM (Cấp thực hiện). Quản lý tài khoản, 3 nhóm ticket (Chỉnh sửa sản phẩm cũ, Listing sản phẩm mới, Công việc văn phòng), email thông báo qua từng bước, thống kê theo trạng thái/nhân sự, cảnh báo Overdue màu warning, lưu chi tiết lịch sử thay đổi trạng thái."

## Clarifications

### Session 2026-11-18

- Q: Kiến trúc triển khai & phương án gửi email tự động khi dùng GitHub Pages + Firebase Free? → A: Dùng **GitHub Pages (JS Framework) + Firebase Auth & Firestore Database Free**, kết hợp **Google Apps Script Web App miễn phí** (gửi email qua Gmail/Workspace) cho toàn bộ thông báo chuyển bước.
- Q: Ở Nhóm II (`Listing sản phẩm mới`), sau khi `OM` điền `URL sản phẩm` ở bước GoLive thì ai đóng ticket, và khi `PD` đánh giá không đạt thì quay lại bước nào? → A: `OM` điền `URL sản phẩm` và gửi lên để **`PD` kiểm tra lần cuối rồi `PD` bấm Đóng ticket**; nếu `PD` kiểm tra sau GoLive thấy không đạt thì ticket quay lại **bước GoLive** (bước sau listing, để `OM` thực hiện/cập nhật lại URL GoLive). Nếu `PD` từ chối ở bước duyệt trước GoLive thì quay lại bước `OM` làm lại listing.
- Q: Cơ chế gán vai trò `PD` vs `OM` khi người dùng đăng ký tài khoản mới? → A: Tài khoản tự đăng ký mới mặc định là **`OM`**; tài khoản `PD` hiện có quyền nâng cấp/chuyển đổi vai trò thành viên trong trang Quản lý nhân sự (và hỗ trợ cấu hình danh sách email `PD` khởi tạo ban đầu / mã mời `PD` để khởi tạo tài khoản `PD` đầu tiên).
- Q: Nhóm III (`Công việc văn phòng`) có cần trường `Deadline` để tính Overdue không? → A: **Có**, trường `Deadline (*)` là bắt buộc tương tự Nhóm I và Nhóm II.
- Q: Cập nhật nghiệp vụ 2026-11-18 (chiều): Ai có quyền tạo, giao việc, duyệt, xem và xóa task? → A: Cả `OM` và `PD` đều có quyền tạo task và giao việc chéo cho bất kỳ thành viên nào trong team (không phân biệt role khi giao việc). Riêng với `Listing sản phẩm mới` do `OM` tạo: bổ sung luôn `SKU dự kiến`, `URL sản phẩm`, chọn `PD` duyệt (`reviewerId`), và auto-pass bước `OM Listing` sang thẳng chờ `PD` đó duyệt GoLive (các `PD` khác chỉ xem, không duyệt được). Mọi tài khoản trong team đều xem được danh sách task; **chỉ tài khoản đã tạo ra task (`createdBy`) mới có quyền xóa task đó**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quản lý Tài khoản & Phân quyền PD / OM (Priority: P1)

Người dùng mới có thể đăng ký tài khoản (mặc định vai trò `OM`, hoặc nhận vai trò `PD` nếu thuộc danh sách khởi tạo/mã mời `PD`), đăng nhập vào hệ thống và cập nhật thông tin cá nhân cơ bản (tên hiển thị, ảnh đại diện). `PD` có thêm quyền quản lý danh sách nhân sự để nâng/hạ vai trò giữa `OM` và `PD`. Hệ thống phân tách rõ hai vai trò **PD (Cấp quản lý)** và **OM (Cấp thực hiện)** để điều hướng giao diện, quyền thao tác ticket và phạm vi xem dữ liệu thống kê.

**Why this priority**: Toàn bộ luồng tạo, xử lý, duyệt ticket và phân quyền xem thống kê phụ thuộc vào danh tính và vai trò (`PD` / `OM`) của người dùng.

**Independent Test**: Có thể kiểm thử độc lập bằng cách đăng ký tài khoản mới (kiểm tra mặc định `OM`), đăng nhập tài khoản `PD` để nâng quyền hoặc cập nhật tên hiển thị + avatar, sau đó kiểm tra màn hình và quyền hiển thị tương ứng từng vai trò.

**Acceptance Scenarios**:

1. **Given** người dùng chưa đăng nhập, **When** mở ứng dụng trên máy tính hoặc di động, **Then** hệ thống hiển thị màn hình Đăng nhập / Đăng ký tối ưu cho cả desktop và mobile.
2. **Given** người dùng tự đăng ký tài khoản mới bằng email thường, **When** hoàn tất đăng ký, **Then** tài khoản được tạo mặc định với vai trò `OM` (trừ trường hợp khớp cấu hình `PD` khởi tạo hoặc mã mời `PD` hợp lệ).
3. **Given** người dùng đã đăng nhập, **When** truy cập trang Hồ sơ cá nhân và cập nhật tên hiển thị hoặc avatar, **Then** thông tin mới được lưu và hiển thị nhất quán trên thanh điều hướng, danh sách ticket và lịch sử thao tác.
4. **Given** người dùng đăng nhập với vai trò `PD`, **When** truy cập mục Quản lý nhân sự, **Then** `PD` có thể xem danh sách tài khoản và chuyển đổi vai trò (`OM` <-> `PD`) cho thành viên khác.
5. **Given** người dùng đăng nhập với vai trò `OM`, **When** truy cập ứng dụng, **Then** người dùng chỉ nhìn thấy các ticket được giao cho mình và không thấy chức năng tạo ticket mới, quản lý vai trò hoặc dữ liệu của nhân sự khác.

---

### User Story 2 - Nhóm việc I: Chỉnh sửa sản phẩm cũ (Priority: P1)

`PD` tạo ticket chỉnh sửa sản phẩm cũ với các thông tin bắt buộc (`Title`, `SKU sản phẩm cần kiểm tra`, `Yêu cầu chỉnh sửa`, `Deadline`, `Nhân sự được giao`). Hệ thống tự động gửi email thông báo tới `OM` được giao. `OM` thực hiện công việc và đánh dấu hoàn thành trên ứng dụng, kích hoạt email báo về cho `PD`. `PD` kiểm tra kết quả để xác nhận **Đóng ticket** hoặc **Yêu cầu làm lại** (đưa ticket quay lại cho `OM` xử lý lại).

**Why this priority**: Đây là luồng nghiệp vụ vận hành cốt lõi giữa quản lý và nhân sự thực hiện với vòng lặp kiểm tra – làm lại và ghi nhận lịch sử.

**Independent Test**: Tạo 1 ticket Nhóm I bằng tài khoản `PD`, kiểm tra email kích hoạt và hiển thị bên tài khoản `OM`, `OM` tích hoàn thành, `PD` thử cả hai nhánh "Yêu cầu làm lại" và "Đóng ticket", xác nhận lịch sử lưu đầy đủ từng bước.

**Acceptance Scenarios**:

1. **Given** tài khoản `PD`, **When** tạo ticket Nhóm I với đầy đủ `Title`, `SKU sản phẩm cần kiểm tra`, `Yêu cầu chỉnh sửa`, `Deadline`, `Nhân sự được giao`, **Then** hệ thống sinh `Id` duy nhất, lưu ticket ở trạng thái `Chờ OM thực hiện` (`WAITING_OM`), ghi lịch sử khởi tạo và gửi email thông báo ticket mới cho `OM`.
2. **Given** ticket Nhóm I đang ở trạng thái `WAITING_OM`, **When** `OM` tích hoàn thành, **Then** trạng thái chuyển sang `Chờ PD kiểm tra` (`PENDING_PD_CHECK`), ghi lịch sử và gửi email thông báo cho `PD`.
3. **Given** ticket Nhóm I đang ở `PENDING_PD_CHECK`, **When** `PD` chọn **Yêu cầu làm lại** (bắt buộc nhập lý do), **Then** trạng thái quay lại `WAITING_OM`, ghi chi tiết vào lịch sử và gửi email thông báo cho `OM`.
4. **Given** ticket Nhóm I đang ở `PENDING_PD_CHECK`, **When** `PD` chọn **Đóng ticket**, **Then** ticket chuyển sang trạng thái `Đã đóng` (`CLOSED`) và ghi lịch sử đóng ticket.

---

### User Story 3 - Nhóm việc II: Listing sản phẩm mới & GoLive (Priority: P1)

`PD` tạo ticket listing sản phẩm mới (`Title`, `Thông tin sản phẩm cơ bản`, `Yêu cầu bổ sung` tùy chọn, `Deadline`, `Nhân sự được giao`). Hệ thống gửi email báo `OM`. `OM` thực hiện listing, tích hoàn thành và nhập **SKU dự kiến của sản phẩm** -> gửi email báo `PD`. `PD` kiểm tra phần listing: có thể từ chối quay lại bước `OM` làm lại listing, hoặc xác nhận **"Golive sản phẩm"** -> gửi email báo `OM`. `OM` thực hiện GoLive, điền **URL sản phẩm** và gửi lên để `PD` kiểm tra lần cuối. Nếu đạt, `PD` bấm **Đóng ticket**; nếu không đạt, ticket quay lại **bước GoLive** (bước sau listing) để `OM` thực hiện/cập nhật lại URL GoLive.

**Why this priority**: Là luồng nghiệp vụ nhiều bước đặc thù nhất (nhập SKU dự kiến, duyệt GoLive, nhập URL sản phẩm, kiểm tra cuối và cơ chế quay lại bước sau listing).

**Independent Test**: Chạy trọn vẹn 1 ticket Nhóm II từ lúc `PD` tạo -> `OM` nhập SKU dự kiến -> `PD` duyệt GoLive -> `OM` điền URL sản phẩm -> `PD` thử trả về bước GoLive -> `OM` gửi lại URL -> `PD` đóng ticket, kiểm tra toàn bộ log lịch sử + email ở mỗi mốc.

**Acceptance Scenarios**:

1. **Given** tài khoản `PD`, **When** tạo ticket Nhóm II với `Title`, `Thông tin sản phẩm cơ bản`, `Yêu cầu bổ sung` (tùy chọn), `Deadline`, `Nhân sự được giao`, **Then** ticket được tạo ở trạng thái `Chờ OM listing` (`WAITING_LISTING`) và gửi email tới `OM`.
2. **Given** ticket Nhóm II đang ở `WAITING_LISTING`, **When** `OM` tích hoàn thành, **Then** hệ thống bắt buộc `OM` nhập `SKU dự kiến` trước khi gửi, sau đó chuyển trạng thái sang `Chờ PD duyệt GoLive` (`PENDING_GOLIVE_APPROVAL`) và gửi email cho `PD`.
3. **Given** ticket Nhóm II đang ở `PENDING_GOLIVE_APPROVAL`, **When** `PD` từ chối listing (nhập lý do), **Then** ticket quay lại `WAITING_LISTING`, ghi lịch sử và gửi email cho `OM` chỉnh sửa lại phần listing.
4. **Given** ticket Nhóm II đang ở `PENDING_GOLIVE_APPROVAL`, **When** `PD` xác nhận **"Golive sản phẩm"**, **Then** trạng thái chuyển sang `Chờ OM GoLive` (`WAITING_GOLIVE`), ghi lịch sử và gửi email thông báo cho `OM`.
5. **Given** ticket Nhóm II đang ở `WAITING_GOLIVE`, **When** `OM` điền `URL sản phẩm` hợp lệ và gửi hoàn thành GoLive, **Then** trạng thái chuyển sang `Chờ PD kiểm tra đóng` (`PENDING_CLOSE`), ghi lịch sử kèm URL và gửi email thông báo cho `PD`.
6. **Given** ticket Nhóm II đang ở `PENDING_CLOSE`, **When** `PD` đánh giá không đạt (nhập lý do), **Then** ticket quay lại `WAITING_GOLIVE` (bước sau listing), ghi lịch sử và gửi email yêu cầu `OM` xử lý lại GoLive; ngược lại nếu `PD` xác nhận đạt và bấm **Đóng ticket**, ticket chuyển sang `CLOSED`.

---

### User Story 4 - Nhóm việc III: Công việc văn phòng nhiều nhân sự (Priority: P2)

`PD` tạo ticket công việc văn phòng với `Title`, `Yêu cầu`, `Deadline`, và chọn **1 hoặc nhiều nhân sự `OM`** được giao. Tất cả nhân sự được giao nhận email thông báo và thấy ticket trên ứng dụng. Mỗi nhân sự tự tích hoàn thành phần của mình. Chỉ khi **tất cả** nhân sự được giao đều tích hoàn thành thì hệ thống mới chuyển trạng thái và gửi email thông báo cho `PD`. Khi `PD` kiểm tra, nếu không đạt thì `PD` **chọn đích danh nhân sự cần làm lại**; chỉ những nhân sự đó bị reset trạng thái hoàn thành và nhận email làm lại.

**Why this priority**: Mở rộng mô hình 1-1 sang 1-nhiều nhân sự với cơ chế đồng bộ tiến độ cá nhân và phản hồi đích danh khi làm lại.

**Independent Test**: Tạo 1 ticket Nhóm III giao cho 2 nhân sự `OM A` và `OM B`; xác nhận khi chỉ `OM A` tích hoàn thành thì chưa báo `PD` (1/2); khi `OM B` tích tiếp thì báo `PD`; thử nghiệm `PD` chọn chỉ `OM A` làm lại -> `OM B` giữ nguyên đã xong, `OM A` quay về chưa xong và nhận email; `OM A` tích lại -> báo `PD` -> `PD` đóng ticket.

**Acceptance Scenarios**:

1. **Given** `PD` tạo ticket Nhóm III giao cho `N` nhân sự (`N >= 1`) kèm `Deadline`, **When** lưu ticket, **Then** email thông báo được gửi cho cả `N` nhân sự và mỗi nhân sự thấy trạng thái hoàn thành riêng của mình trên ticket.
2. **Given** ticket có `N` nhân sự (`N > 1`), **When** mới có `k < N` nhân sự tích hoàn thành, **Then** ticket vẫn ở trạng thái `Đang thực hiện` (`WAITING_OM`, hiển thị tiến độ `k/N`), chưa chuyển sang `PENDING_PD_CHECK` và chưa gửi email cho `PD`.
3. **Given** nhân sự cuối cùng trong `N` nhân sự tích hoàn thành (`k = N`), **When** cập nhật hoàn tất, **Then** ticket tự động chuyển sang `PENDING_PD_CHECK` và gửi email thông báo cho `PD`.
4. **Given** ticket Nhóm III đang ở `PENDING_PD_CHECK`, **When** `PD` chọn **Yêu cầu làm lại** và tick chọn `M` nhân sự đích danh (`1 <= M <= N`) kèm lý do, **Then** chỉ `M` nhân sự được chọn bị đặt lại trạng thái chưa hoàn thành (các nhân sự còn lại giữ nguyên đã hoàn thành), ticket chuyển về `WAITING_OM`, ghi rõ danh sách nhân sự làm lại vào lịch sử và gửi email chỉ cho `M` nhân sự đó.
5. **Given** ticket Nhóm III đang ở `PENDING_PD_CHECK`, **When** `PD` xác nhận **Đóng ticket**, **Then** ticket chuyển sang `CLOSED` và ghi lịch sử đóng ticket.

---

### User Story 5 - Thống kê, Lọc Task & Cảnh báo Overdue (Priority: P2)

Ứng dụng cung cấp màn hình thống kê và danh sách lọc task: hiển thị số lượng task theo từng trạng thái của từng nhân sự, tổng số task theo từng trạng thái của cả team (`PD`), hoặc chỉ các task của bản thân (`OM`). Các task quá `Deadline` mà chưa đóng phải hiển thị cảnh báo trực quan màu warning (Overdue).

**Why this priority**: Giúp cấp quản lý (`PD`) giám sát tắc nghẽn và deadline của team, đồng thời giúp `OM` tự theo dõi công việc trễ hạn.

**Independent Test**: Tạo dữ liệu mẫu gồm nhiều ticket ở cả 3 nhóm, các trạng thái khác nhau và có ticket quá deadline; kiểm tra bộ lọc theo nhân sự/trạng thái/nhóm/Overdue, kiểm tra số liệu thống kê ở tài khoản `PD` (thấy cả team) vs `OM` (chỉ thấy của mình), và kiểm tra nhãn cảnh báo Overdue.

**Acceptance Scenarios**:

1. **Given** người dùng là `PD`, **When** xem trang Thống kê, **Then** hiển thị tổng số task theo từng trạng thái của toàn team, bảng/biểu đồ phân bổ trạng thái theo từng nhân sự, và bộ lọc theo nhân sự, trạng thái, nhóm việc, Overdue.
2. **Given** người dùng là `OM`, **When** xem trang Thống kê hoặc Danh sách Task, **Then** hệ thống chỉ hiển thị số liệu và danh sách các task được giao cho chính `OM` đó (bao gồm ticket Nhóm III có mặt `OM` trong danh sách giao), không cho phép lọc/xem task của nhân sự khác.
3. **Given** bất kỳ ticket nào thuộc Nhóm I, II hoặc III có `Deadline < thời điểm hiện tại` và trạng thái khác `CLOSED`, **When** hiển thị trên danh sách, chi tiết ticket và thống kê, **Then** ticket được gắn nhãn/màu cảnh báo **Overdue (Warning)** rõ ràng và đếm vào chỉ số `Overdue`.

---

### User Story 6 - Lịch sử Thay đổi Trạng thái Chi tiết (Priority: P2)

Mỗi ticket đều lưu trữ và hiển thị dòng thời gian (timeline) chi tiết từng lần tạo và thay đổi trạng thái, bao gồm thời điểm thực hiện, người thao tác, trạng thái cũ -> trạng thái mới, và dữ liệu đính kèm bước đó (`SKU dự kiến`, `URL sản phẩm`, `Lý do làm lại`, danh sách nhân sự được chỉ định làm lại ở Nhóm III, ghi chú).

**Why this priority**: Đảm bảo tính minh bạch, truy vết trách nhiệm khi có sự cố hoặc bị `PD` yêu cầu làm lại nhiều lần.

**Independent Test**: Thực hiện đầy đủ chu kỳ chuyển trạng thái (bao gồm ít nhất 1 lần bị trả về làm lại) trên ticket Nhóm II và Nhóm III, kiểm tra timeline lịch sử hiển thị đúng thứ tự thời gian và đầy đủ thông tin.

**Acceptance Scenarios**:

1. **Given** một ticket trải qua nhiều lần chuyển trạng thái (kể cả quay vòng làm lại), **When** người dùng có quyền xem mở chi tiết ticket, **Then** toàn bộ lịch sử được hiển thị theo trình tự thời gian với đầy đủ người thực hiện, vai trò, thời gian, chuyển đổi trạng thái và nội dung bổ sung.

---

### Edge Cases

- **Dịch vụ Google Apps Script gửi email gặp lỗi hoặc timeout**: Việc chuyển trạng thái ticket trong Firestore vẫn phải hoàn tất nhất quán trước, không làm mất dữ liệu công việc; hệ thống ghi log vào `emailLogs` với trạng thái `FAILED` và hiển thị thông báo nhẹ cho người thao tác (cho phép bấm "Gửi lại email thông báo" nếu cần).
- **Thao tác đồng thời trên Nhóm III**: Khi 2 nhân sự cùng tích hoàn thành gần như đồng thời trên cùng một ticket Nhóm III, hệ thống sử dụng transaction trên Firestore để cập nhật từng khóa `assigneeStates[uid]` độc lập mà không ghi đè lẫn nhau, và chỉ chuyển trạng thái sang `PENDING_PD_CHECK` + gửi email cho `PD` đúng 1 lần khi tất cả `N` khóa đều `completed: true`.
- **Chuyển vai trò tài khoản đang có ticket**: Nếu một `OM` được nâng lên `PD` hoặc ngược lại, các ticket cũ vẫn giữ nguyên lịch sử và liên kết người dùng; `PD` vẫn có thể tạo/duyệt ticket mới bình thường.
- **Kích thước ảnh Avatar trên Firestore Free**: Ảnh tải lên từ thiết bị phải được tự động resize và nén client-side (ví dụ tối đa `256×256px`, dung lượng `< 80KB` base64 WebP/JPEG) hoặc chọn avatar mặc định / URL ảnh để không phụ thuộc Firebase Storage trả phí.
- **Tạo tài khoản PD đầu tiên (Bootstrap)**: Hệ thống cần cơ chế khởi tạo `PD` đầu tiên khi chưa có `PD` nào trong database (qua cấu hình danh sách email `PD` mặc định hoặc mã mời `PD` trong cài đặt hệ thống) để tránh tình trạng toàn bộ tài khoản đều là `OM` và không ai nâng quyền được.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST hỗ trợ đăng ký, đăng nhập, đăng xuất bằng Email/Mật khẩu qua Firebase Auth và cập nhật hồ sơ cá nhân (`Tên hiển thị`, `Avatar`).
- **FR-002**: Tài khoản tự đăng ký mới MUST mặc định mang vai trò `OM`, trừ trường hợp khớp cấu hình `PD` khởi tạo hoặc mã mời `PD` hợp lệ; `PD` MUST có giao diện quản lý để chuyển đổi vai trò (`OM` <-> `PD`) cho các thành viên khác.
- **FR-003**: Hệ thống MUST phân quyền chặt chẽ cả ở UI lẫn Firestore Security Rules: `PD` xem/quản lý toàn bộ ticket và thống kê toàn team; `OM` chỉ đọc/thao tác trên các ticket mình được giao và chỉ xem thống kê cá nhân.
- **FR-004**: Hệ thống MUST sinh mã `Id` hiển thị ngắn gọn, duy nhất cho mỗi ticket (ví dụ: `CS-0001`, `LS-0001`, `VP-0001`) kèm thời điểm tạo và `createdBy`.
- **FR-005**: Hệ thống MUST hỗ trợ đầy đủ 3 nhóm công việc cố định với các trường dữ liệu bắt buộc và tùy chọn:
  - **Nhóm I (`Chỉnh sửa sản phẩm cũ`)**: `Id`, `Title(*)`, `SKU sản phẩm cần kiểm tra(*)`, `Yêu cầu chỉnh sửa(*)`, `Deadline(*)`, `Nhân sự được giao (1 OM)(*)`.
  - **Nhóm II (`Listing sản phẩm mới`)**: `Id`, `Title(*)`, `Thông tin sản phẩm cơ bản(*)`, `Yêu cầu bổ sung`, `Deadline(*)`, `Nhân sự được giao (1 OM)(*)`, kèm `SKU dự kiến(*)` ở bước `OM` hoàn thành listing và `URL sản phẩm(*)` ở bước `OM` hoàn thành GoLive.
  - **Nhóm III (`Công việc văn phòng`)**: `Id`, `Title(*)`, `Yêu cầu(*)`, `Deadline(*)`, `Các nhân sự được giao (1..N OM)(*)`.
- **FR-006**: Hệ thống MUST thực thi đúng máy trạng thái (state machine) cố định của từng nhóm:
  - Nhóm I: `WAITING_OM` ↔ `PENDING_PD_CHECK` → `CLOSED`.
  - Nhóm II: `WAITING_LISTING` ↔ `PENDING_GOLIVE_APPROVAL` → `WAITING_GOLIVE` ↔ `PENDING_CLOSE` → `CLOSED` (từ chối ở `PENDING_GOLIVE_APPROVAL` quay về `WAITING_LISTING`; từ chối ở `PENDING_CLOSE` quay về `WAITING_GOLIVE`).
  - Nhóm III: `WAITING_OM` (theo dõi từng `OM`) → (khi N/N xong) `PENDING_PD_CHECK` → `CLOSED`, hoặc `PD` chọn đích danh 1..N `OM` làm lại để reset trạng thái các `OM` đó về chưa xong và quay lại `WAITING_OM`.
- **FR-007**: Hệ thống MUST tích hợp **Google Apps Script Web App** để tự động gửi email thông báo tại tất cả các mốc chuyển giao trách nhiệm:
  - Tạo ticket mới -> gửi email tới `OM` được giao (cả N người nếu Nhóm III).
  - `OM` hoàn thành (Nhóm I, Nhóm II listing, Nhóm II GoLive URL, hoặc người cuối cùng hoàn thành Nhóm III) -> gửi email tới `PD` phụ trách (`createdBy` của ticket).
  - `PD` xác nhận "Golive sản phẩm" (Nhóm II) -> gửi email tới `OM`.
  - `PD` yêu cầu làm lại (Nhóm I, Nhóm II listing/GoLive, hoặc chỉ các `OM` được chọn ở Nhóm III) -> gửi email tới đúng `OM` cần làm lại kèm lý do.
- **FR-008**: Hệ thống MUST lưu trữ và hiển thị lịch sử bất biến (`TicketHistory`) cho mọi lần tạo mới và chuyển trạng thái, ghi nhận `timestamp`, `actor`, `fromStatus`, `toStatus`, `action`, `note`, và `metadata` (`expectedSku`, `productUrl`, `reworkTargetUids`).
- **FR-009**: Hệ thống MUST cung cấp màn hình Thống kê & Bộ lọc: đếm số lượng task theo từng trạng thái của từng nhân sự và tổng cả team; lọc theo nhân sự (`PD`), trạng thái, nhóm việc, và `Overdue`; tính và hiển thị cảnh báo **Overdue** màu warning cho mọi ticket chưa `CLOSED` có `Deadline < hiện tại`.
- **FR-010**: Giao diện MUST tối ưu thao tác cảm ứng trên Mobile (`375px+`) và Desktop (`1024px+`), sẵn sàng deploy tĩnh lên **GitHub Pages**.

### Key Entities *(include if feature involves data)*

- **User (`users/{uid}`)**: `uid`, `email`, `displayName`, `avatarDataUrl`, `role` (`PD` | `OM`), `createdAt`, `updatedAt`.
- **Ticket (`tickets/{ticketId}`)**: `id`, `code`, `groupType` (`EDIT_OLD` | `NEW_LISTING` | `OFFICE`), `title`, `status`, `deadline`, `createdBy`, `createdByName`, `createdByEmail`, `createdAt`, `updatedAt`, `closedAt`, `assigneeIds` (`string[]`), `assigneeSnapshots` (map `uid -> { displayName, email, avatarDataUrl }`), `assigneeStates` (map `uid -> { completed: boolean, completedAt, note }` cho Nhóm III), cùng payload chuyên biệt (`sku`, `editRequirements`, `productBasicInfo`, `additionalRequirements`, `expectedSku`, `productUrl`).
- **TicketHistory (`tickets/{ticketId}/history/{historyId}`)**: `id`, `ticketId`, `actorId`, `actorName`, `actorRole`, `fromStatus`, `toStatus`, `action`, `note`, `metadata` (`expectedSku`, `productUrl`, `reworkTargetUids`, `reworkTargetNames`), `createdAt`.
- **SystemConfig (`config/app`)**: `pdInviteCodeHash` / `bootstrapPdEmails`, `ticketCounters` (bộ đếm sinh mã ticket), `emailWebhookConfigured`.
- **EmailLog (`emailLogs/{logId}`)**: `id`, `ticketId`, `ticketCode`, `eventType`, `recipients`, `status` (`SENT` | `FAILED`), `errorMessage`, `createdAt`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `PD` có thể tạo và giao một ticket mới thuộc bất kỳ nhóm nào trong dưới 45 giây trên cả máy tính và điện thoại.
- **SC-002**: `OM` có thể mở ứng dụng trên di động, tìm thấy ticket cần làm, nhập thông tin bắt buộc (`SKU dự kiến` hoặc `URL sản phẩm`) và tích hoàn thành trong dưới 30 giây.
- **SC-003**: 100% các lần chuyển trạng thái hợp lệ tạo ra đúng 1 bản ghi lịch sử chi tiết và kích hoạt yêu cầu gửi email thông báo tương ứng.
- **SC-004**: Số liệu thống kê theo trạng thái/nhân sự và cảnh báo Overdue cập nhật tức thời (dưới 2 giây sau khi ticket thay đổi trạng thái) và đảm bảo `OM` không thể truy cập dữ liệu của nhân sự khác.
- **SC-005**: Tất cả màn hình chính vận hành mượt mà không vỡ layout ở độ rộng từ `375px` (mobile) đến `1440px` (desktop), và deploy chạy hoàn chỉnh trên GitHub Pages với chi phí vận hành 0 đồng.

## Assumptions

- Đội ngũ sử dụng nội bộ có quy mô vừa và nhỏ (5–50 nhân sự); số lượng email thông báo nằm gọn trong hạn mức gửi hàng ngày của Gmail/Google Workspace qua Google Apps Script (~100 email/ngày cho Gmail cá nhân, ~1.500 email/ngày cho Google Workspace).
- Múi giờ chuẩn của deadline và hiển thị thời gian là `UTC+7` (`Asia/Ho_Chi_Minh`).
- Nghiệp vụ chỉ cố định 3 nhóm ticket như đã thống nhất, không phát sinh custom workflow builder động.
