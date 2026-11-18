# Joytime Checklist — Web App Kiểm soát Task Công việc (PD & OM)

Ứng dụng quản lý và kiểm soát tiến độ ticket công việc cho cả **Desktop** và **Mobile**, chạy hoàn toàn miễn phí trên **GitHub Pages + Firebase Auth/Firestore (Spark Free) + Google Apps Script**.

## Tài liệu Spec Kit & UI/UX Pro Max

- Đặc tả nghiệp vụ: [specs/001-ticket-task-control/spec.md](specs/001-ticket-task-control/spec.md)
- Kế hoạch triển khai: [specs/001-ticket-task-control/plan.md](specs/001-ticket-task-control/plan.md)
- Mô hình dữ liệu & State Machine: [specs/001-ticket-task-control/data-model.md](specs/001-ticket-task-control/data-model.md)
- Design System (UI/UX Pro Max): [design-system/joytime-checklist/MASTER.md](design-system/joytime-checklist/MASTER.md)

## Hướng dẫn cài đặt & triển khai (100% Free Tier)

### 1. Tạo Firebase Project (Gói Spark Free)
1. Truy cập [Firebase Console](https://console.firebase.google.com/) → tạo project mới (không cần gắn thẻ thanh toán).
2. Bật **Authentication** → Sign-in method → bật **Email/Password**.
3. Tạo **Cloud Firestore** (Production mode).
4. Copy nội dung file [firestore.rules](firestore.rules) vào tab **Firestore Rules** và nhấn Publish.
5. Tạo composite index theo [firestore.indexes.json](firestore.indexes.json) (hoặc bấm link tự tạo index trên console ở lần query đầu tiên của `OM`).
6. Trong **Project Settings → General → Your apps (Web)**, lấy cấu hình `apiKey`, `authDomain`, `projectId`, `appId`.

### 2. Cài đặt Google Apps Script gửi Email miễn phí
1. Truy cập [script.google.com](https://script.google.com) → tạo project mới.
2. Dán toàn bộ code trong [gas/Code.gs](gas/Code.gs) vào `Code.gs`.
3. Đặt `SHARED_SECRET` (chuỗi bí mật tự chọn).
4. Chọn **Deploy → New deployment → Web app**:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
5. Lưu lại **Web app URL** (`https://script.google.com/macros/s/.../exec`).

### 3. Cấu hình lưu tệp đính kèm trên Cloudflare R2 (Ảnh, PDF, Word, Excel ≤ 5MB)
- **Khi chạy local (`npm run dev`)**: Điền `VITE_R2_ENDPOINT`, `VITE_R2_BUCKET`, `VITE_R2_ACCESS_KEY`, `VITE_R2_SECRET_KEY` vào `.env.local` (Vite dev proxy `/r2-proxy` tự xử lý CORS).
- **Khi deploy lên GitHub Pages (Khuyến nghị bảo mật — KHÔNG đưa `SECRET_KEY` lên frontend public)**:
  1. Tạo 1 **Cloudflare Worker** miễn phí từ [cloudflare-worker/r2-worker.js](cloudflare-worker/r2-worker.js).
  2. Gắn R2 Binding `BUCKET` → bucket `checklist-portal` và biến `WORKER_SECRET`.
  3. Chỉ điền `VITE_R2_WORKER_URL` và `VITE_R2_WORKER_SECRET` vào GitHub Secrets.

### 4. Chạy local
```bash
npm install
cp .env.example .env.local
# Điền thông tin Firebase, VITE_BOOTSTRAP_PD_EMAILS, VITE_GAS_WEBHOOK_URL, VITE_GAS_SECRET
npm test
npm run dev
```

### 5. Deploy lên GitHub Pages
1. Push mã nguồn lên GitHub (nhánh `main`).
2. Vào **Settings → Pages → Source** chọn **GitHub Actions**.
3. Vào **Settings → Secrets and variables → Actions → Repository secrets**, thêm:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_BOOTSTRAP_PD_EMAILS`
   - `VITE_GAS_WEBHOOK_URL`
   - `VITE_GAS_SECRET`
4. Workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) sẽ tự động chạy `npm test`, `npm run build` và deploy lên GitHub Pages.
