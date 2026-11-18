# Technical Research: Joytime Checklist

**Feature**: `001-ticket-task-control` | **Date**: 2026-11-18

## 1. Frontend Stack & GitHub Pages Hosting

- **Decision**: **React 19 + TypeScript + Vite + Tailwind CSS v4 + HashRouter (`react-router-dom`) + Lucide React**.
- **Rationale**:
  - Vite builds a clean static bundle (`dist/`) with near-instant HMR and zero server requirements, deploying seamlessly to **GitHub Pages** via GitHub Actions or `gh-pages`.
  - Using `HashRouter` (or SPA fallback `404.html`) guarantees deep links to `/tickets/:id` work directly on GitHub Pages even when refreshed on mobile or desktop, without 404 errors from GitHub's static file server.
  - TypeScript enforces strict typing across the 3 fixed ticket schemas, state-machine transitions, and Firestore payloads, preventing field mismatches.
  - Tailwind CSS v4 + CSS variables cleanly implements every design token from `design-system/joytime-checklist/MASTER.md`.
- **Alternatives Considered**:
  - *Next.js SSR*: Unnecessary overhead; static export adds routing caveats without real benefit for an authenticated internal SPA.
  - *Vanilla JS*: Faster to start, but fragile for 3 distinct multi-step forms, role guards, charts, and audit timelines.

## 2. Database, Auth & Avatar Storage (Firebase Free / Spark Plan)

- **Decision**: **Firebase Authentication (Email/Password)** + **Cloud Firestore (Free Spark Tier)** + **Client-side compressed Base64 Avatars (<= 80KB)** stored directly on `users/{uid}`.
- **Rationale**:
  - Firebase Auth Free tier provides unlimited Email/Password sign-up/sign-in and session persistence.
  - Cloud Firestore Free (Spark) provides `1 GiB` storage, `50,000` reads/day, and `20,000` writes/day — vastly more than needed for a 5–50 person internal team.
  - Firebase Cloud Storage now requires the Blaze plan on newly created projects in many regions; resizing uploaded avatars on `<canvas>` to `256×256px` JPEG/WebP (`<= 80KB` Data URL) or letting users pick preset avatars/URLs keeps the entire app **100% Free Spark Tier with zero billing card required**.
- **Alternatives Considered**:
  - *Firebase Realtime Database*: Works, but Firestore offers richer structured queries (`array-contains` for multi-assignee Group III tickets, subcollections for immutable `history`, and `runTransaction` for concurrent OM completions).

## 3. Automated Email Notifications on Free Tier (Google Apps Script)

- **Decision**: **Google Apps Script Web App (`doPost`)** triggered from the client immediately after each successful Firestore transition, authenticated via a shared webhook token (`appSecret` stored in `config/emailSecret` readable only by authenticated users, or validated in Apps Script).
- **Rationale**:
  - Firebase Spark blocks outbound network calls from Cloud Functions and does not deploy Cloud Functions without Blaze.
  - Google Apps Script deploys as a free HTTPS Web App (`Execute as: Me`, `Who has access: Anyone`) using `MailApp.sendEmail` / `GmailApp.sendEmail` (~100 emails/day on free `@gmail.com`, ~1,500/day on Google Workspace).
  - **CORS Handling Detail**: Browser `fetch()` sending `Content-Type: text/plain;charset=utf-8` (with JSON string body) avoids CORS `OPTIONS` preflight requests against `script.google.com/macros/s/.../exec`, allowing clean JSON responses (`{ ok: true }`) or graceful fallback logging to `emailLogs` if blocked/offline.
  - **Non-blocking Resilience**: Firestore state transition commits **first**; email dispatch runs right after and logs `SENT` or `FAILED` into `emailLogs`. Failed emails can be retried from the UI without losing ticket state.
- **Alternatives Considered**:
  - *EmailJS*: Free tier capped at 200 emails/month, which a multi-step ticket workflow can exhaust quickly.
  - *.NET + SQLite + SMTP*: Valid fallback, rejected per user preference for zero-cost GitHub Pages + Firebase Free.

## 4. Role Assignment & Bootstrap Security

- **Decision**:
  - Default self-registration assigns `role: "OM"`.
  - To bootstrap the very first `PD` (and allow controlled `PD` onboarding), `config/bootstrap` stores an optional `pdInviteCode` (or initial `bootstrapPdEmails` list) AND once any `PD` exists, `PD` manages roles via the `Quản lý nhân sự` page.
  - Firestore Security Rules enforce:
    - `OM` can only read tickets where `request.auth.uid in resource.data.assigneeIds`.
    - `OM` can only update specific transition fields when performing an allowed OM step (`WAITING_OM`, `WAITING_LISTING`, `WAITING_GOLIVE`).
    - Only `PD` can create tickets, close tickets, approve GoLive, request rework, and update user roles.

## 5. Statistics & Charting

- **Decision**: **Lightweight responsive SVG / Chart.js (or Recharts)** horizontal/grouped bar charts + accessible tabular breakdown.
- **Rationale**:
  - With 5–50 staff and dozens/hundreds of active tickets, client-side aggregation from Firestore real-time listeners (`onSnapshot` scoped by role) computes team/personal status counts and `Overdue` alerts in `< 5ms` with zero extra read cost or server aggregation jobs.
- **Time & Overdue Logic**:
  - Overdue is computed dynamically against `Date.now()` (`ticket.status !== 'CLOSED' && ticket.deadline.toMillis() < Date.now()`), refreshing every 60 seconds in UI and displayed in `Asia/Ho_Chi_Minh` (`UTC+7`).
