# Quickstart & Validation Guide: Joytime Checklist

**Feature**: `001-ticket-task-control` | **Date**: 2026-11-18

## Prerequisites

1. Node.js 20+ & npm.
2. A free **Firebase Project** (Spark plan — no credit card required):
   - Enable **Authentication** → Sign-in method: **Email/Password**.
   - Create **Cloud Firestore** database (Production mode, deploy `firestore.rules`).
3. A **Google Account** (Gmail or Google Workspace) for **Google Apps Script** Web App email sending.
4. A **GitHub Repository** with GitHub Pages enabled (GitHub Actions workflow).

## Local Setup & Automated Verification

```powershell
# 1. Install dependencies
npm install

# 2. Configure environment variables (.env.local from .env.example)
# VITE_FIREBASE_API_KEY=...
# VITE_FIREBASE_AUTH_DOMAIN=...
# VITE_FIREBASE_PROJECT_ID=...
# VITE_FIREBASE_APP_ID=...
# VITE_BOOTSTRAP_PD_EMAILS=minh@example.com
# VITE_GAS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
# VITE_GAS_SECRET=...

# 3. Run unit tests (State Machines, Group III aggregation, Overdue, Stats scoping)
npm test

# 4. Start local dev server
npm run dev
```

## End-to-End Validation Scenarios

1. **Account & Role Bootstrap**:
   - Register Account A using an email listed in `bootstrapPdEmails` (or PD invite code) → verify role is `PD`.
   - Register Account B and Account C normally → verify default role is `OM`.
   - Update display name & upload avatar image → verify image compresses to `<= 80KB` and displays across views.
2. **Group I (`Chỉnh sửa sản phẩm cũ`)**:
   - `PD` creates ticket with `SKU` + `Deadline` assigned to `OM B` → verify email sent to `OM B`.
   - `OM B` ticks complete → verify email sent to `PD A`.
   - `PD A` clicks `Yêu cầu làm lại` with reason → verify status returns to `WAITING_OM` & email sent to `OM B`.
   - `OM B` completes again → `PD A` closes ticket → verify 5 immutable entries in History timeline.
3. **Group II (`Listing sản phẩm mới`)**:
   - `PD A` creates ticket → `OM B` submits listing with required `SKU dự kiến` → `PD A` approves `"Golive sản phẩm"` → `OM B` submits `URL sản phẩm` → `PD A` rejects back to GoLive (`WAITING_GOLIVE`) → `OM B` updates URL → `PD A` closes ticket.
4. **Group III (`Công việc văn phòng`)**:
   - `PD A` creates ticket with `Deadline` assigned to both `OM B` and `OM C`.
   - `OM B` ticks complete → verify progress `1/2`, status remains `WAITING_OM`, NO email sent to `PD A`.
   - `OM C` ticks complete → verify progress `2/2`, status auto-transitions to `PENDING_PD_CHECK`, email sent to `PD A`.
   - `PD A` selects ONLY `OM B` for rework → verify `OM C` remains completed, `OM B` reset to incomplete, email sent only to `OM B`.
5. **Statistics, Overdue & Mobile Responsiveness**:
   - Set a ticket's `Deadline` in the past → verify Warning Overdue badge + counter appear.
   - Verify `OM` views only personal tickets/stats while `PD` views full team matrix + filters.
   - Verify `375×812` mobile viewport (Bottom Nav, Card list, Touch targets `>=44px`, zero horizontal overflow) and `1280×800` desktop viewport.
