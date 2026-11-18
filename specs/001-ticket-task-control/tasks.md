---
description: "Actionable task list for Joytime Checklist (001-ticket-task-control)"
---

# Tasks: Joytime Checklist (Hệ thống Kiểm soát Task Công việc)

**Input**: Design documents from `/specs/001-ticket-task-control/` and `/design-system/joytime-checklist/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/firestore-and-apps-script.md`, `quickstart.md`

**Tests**: Unit tests via Vitest are included for the deterministic state-machine engine, Group III multi-assignee aggregation, overdue detection, and role-scoped statistics per Constitution Principle V.

**Organization**: Tasks are grouped by phase and user story (`US1`–`US6`) so each slice can be built and verified incrementally.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`–`US6`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Vite + React + TypeScript + Tailwind CSS v4 + Design Tokens + Firebase/Vitest scaffolding

- [x] T001 Initialize Vite React TypeScript project (`package.json`, `tsconfig.json`, `vite.config.ts` with GitHub Pages `base` config, `index.html` loading `Fira Sans` & `Fira Code` Google Fonts)
- [x] T002 [P] Configure Tailwind CSS v4 and UI/UX Pro Max CSS design tokens (`--color-primary`, `--color-accent`, `--color-warning`, `--font-sans`, `--font-mono`, reduced-motion rules) in `src/index.css`
- [x] T003 [P] Create `.env.example`, Firebase SDK initialization in `src/config/firebase.ts`, and `vitest.config.ts`
- [x] T004 [P] Create Google Apps Script email webhook script in `gas/Code.gs` and GitHub Pages deployment workflow in `.github/workflows/deploy.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, deterministic state machine, Firestore rules/indexes, email service, and responsive app shell

**⚠️ CRITICAL**: No user story UI work begins until domain types, state machine core, and app shell are ready.

- [x] T005 [P] Define TypeScript interfaces for Users, Roles (`PD` | `OM`), Tickets (Group I, II, III), Statuses, and History entries in `src/types/user.ts` and `src/types/ticket.ts`
- [x] T006 Implement deterministic state-machine engine (`getAvailableActions`, `validateTransition`, `computeTransitionResult` for Group I, II, III) in `src/domain/ticketStateMachine.ts`
- [x] T007 [P] Implement `isTicketOverdue` and `computeStatistics` helper functions in `src/domain/ticketStats.ts`
- [x] T008 [P] Write comprehensive Vitest unit tests covering Group I rework/close, Group II SKU/GoLive/URL/reject-to-GoLive, Group III partial/full/targeted-rework, Overdue, and Stats scoping in `src/domain/ticketStateMachine.test.ts`
- [x] T009 [P] Write Firestore security rules (`firestore.rules`) and composite indexes (`firestore.indexes.json`) matching `contracts/firestore-and-apps-script.md`
- [x] T010 Implement Google Apps Script email dispatch client and `emailLogs` recorder in `src/services/emailService.ts`
- [x] T011 [P] Create reusable accessible UI primitives in `src/components/ui/StatusBadge.tsx`, `src/components/ui/UserAvatar.tsx`, `src/components/ui/ModalOrSheet.tsx`, and `src/components/ui/ErrorSummary.tsx`
- [x] T012 Create responsive `AppShell` (Desktop left sidebar + Mobile sticky top bar & bottom navigation bar with `44×44px` touch targets) in `src/components/layout/AppShell.tsx` and route guard in `src/components/layout/ProtectedRoute.tsx`

**Checkpoint**: Domain logic tested via `npm test`; layout shell and shared UI primitives ready.

---

## Phase 3: User Story 1 - Quản lý Tài khoản & Phân quyền PD / OM (Priority: P1) 🎯 MVP Foundation

**Goal**: Email/password registration (default `OM`, optional `PD` invite/bootstrap), sign-in/out, profile update (display name + compressed avatar `<=80KB`), and `PD`-only member role management.

- [x] T013 [P] [US1] Implement `authService.ts` (register with default `OM` / bootstrap PD email or invite code check, login, logout, client-side `<canvas>` avatar resize/compress `<= 80KB`, profile update) in `src/services/authService.ts`
- [x] T014 [P] [US1] Implement `userService.ts` (subscribe to team users, update member `role` by `PD`, update `pdInviteCode` config) in `src/services/userService.ts`
- [x] T015 [US1] Build `AuthContext` managing Firebase Auth session and live Firestore `users/{uid}` profile in `src/contexts/AuthContext.tsx`
- [x] T016 [P] [US1] Build `AuthPage` (Login / Register tabs, inline validation, error alert banner, optional PD invite code input) in `src/pages/AuthPage.tsx`
- [x] T017 [P] [US1] Build `ProfilePage` (display name editor, compressed avatar uploader + preset avatars, sign-out button) in `src/pages/ProfilePage.tsx`
- [x] T018 [US1] Build `TeamPage` (PD-only member directory, role switcher `OM` <-> `PD` with last-PD guardrail, PD invite code settings) in `src/pages/TeamPage.tsx`
- [x] T019 [US1] Wire `HashRouter` routes (`/auth`, `/`, `/tickets`, `/tickets/:id`, `/profile`, `/team`) in `src/App.tsx`

---

## Phase 4: User Story 2 - Nhóm việc I: Chỉnh sửa sản phẩm cũ (Priority: P1) 🎯

**Goal**: `PD` creates Group I tickets (`SKU`, `Yêu cầu chỉnh sửa`, `Deadline`, `1 OM`), `OM` executes & ticks complete, `PD` approves/closes or requests rework with reason, sending email at every handoff.

- [x] T020 [US2] Implement Firestore ticket creation (`tickets` + atomic `CS-XXXX` counter + initial `history` entry) and Group I state transition persistence in `src/services/ticketService.ts`
- [x] T021 [US2] Build `CreateTicketModal` supporting Group I fields (`Title`, `SKU`, `Yêu cầu chỉnh sửa`, `Deadline`, single `OM` picker) with focusable `ErrorSummary` in `src/components/tickets/CreateTicketModal.tsx`
- [x] T022 [US2] Build `TicketStepper` and `TicketActionPanel` for Group I (`OM` complete form; `PD` Close / Rework-with-reason form) in `src/components/tickets/TicketStepper.tsx` and `src/components/tickets/TicketActionPanel.tsx`
- [x] T023 [US2] Wire `TicketsPage` (Desktop Table + Mobile Cards) and `TicketDetailPage` with Group I end-to-end flow and email notifications in `src/pages/TicketsPage.tsx` and `src/pages/TicketDetailPage.tsx`

---

## Phase 5: User Story 3 - Nhóm việc II: Listing sản phẩm mới & GoLive (Priority: P1)

**Goal**: Full 5-step Group II flow (`PD` creates → `OM` submits `SKU dự kiến` → `PD` approves `"Golive sản phẩm"` or rejects to listing → `OM` submits `URL sản phẩm` → `PD` closes or rejects back to `WAITING_GOLIVE`).

- [x] T024 [US3] Extend `CreateTicketModal` with Group II schema (`Thông tin sản phẩm cơ bản(*)`, `Yêu cầu bổ sung`, `Deadline(*)`, `1 OM(*)`) in `src/components/tickets/CreateTicketModal.tsx`
- [x] T025 [US3] Extend `ticketService.ts` to persist `LS-XXXX` tickets, `expectedSku`, `productUrl`, and trigger `GOLIVE_APPROVED` / `GOLIVE_SUBMITTED` emails in `src/services/ticketService.ts`
- [x] T026 [US3] Extend `TicketStepper` and `TicketActionPanel` for all Group II steps (`SKU dự kiến` required input, `"Golive sản phẩm"` CTA, `URL sản phẩm` validation, final `PD` check & reject-to-GoLive) in `src/components/tickets/TicketStepper.tsx` and `src/components/tickets/TicketActionPanel.tsx`

---

## Phase 6: User Story 4 - Nhóm việc III: Công việc văn phòng nhiều nhân sự (Priority: P2)

**Goal**: `PD` assigns `1..N` OMs with `Deadline`; each `OM` ticks completion atomically via Firestore transaction; only when `N/N` complete does status move to `PENDING_PD_CHECK` & email `PD`; `PD` can close or select specific `OM`(s) for rework.

- [x] T027 [US4] Extend `CreateTicketModal` with Group III schema (`Title(*)`, `Yêu cầu(*)`, `Deadline(*)`, multi-select `OM` picker `>=1`) in `src/components/tickets/CreateTicketModal.tsx`
- [x] T028 [US4] Implement Firestore `runTransaction` for concurrent Group III `OM` checkoffs and `PD` targeted rework reset (`reworkTargetUids`) in `src/services/ticketService.ts`
- [x] T029 [US4] Build Group III per-OM progress checklist and `PD` multi-select targeted rework UI in `src/components/tickets/TicketActionPanel.tsx` and ticket card/table progress badges in `src/components/tickets/TicketTable.tsx` and `src/components/tickets/TicketCardList.tsx`

---

## Phase 7: User Story 5 - Thống kê, Lọc Task & Cảnh báo Overdue (Priority: P2)

**Goal**: Role-scoped Dashboard & Filters (`PD` sees team KPIs, grouped bar chart, per-OM status matrix, and all filters; `OM` sees personal KPIs and priority list; Warning Overdue badges across all overdue open tickets).

- [x] T030 [P] [US5] Build `TicketFilterBar` (Desktop inline filter bar + Mobile bottom-sheet filter drawer: Search, Group, Status, Assignee for `PD`, Overdue Warning toggle) in `src/components/tickets/TicketFilterBar.tsx`
- [x] T031 [P] [US5] Build Desktop `TicketTable` and Mobile `TicketCardList` with Overdue Warning row/card highlighting and quick filter integration in `src/components/tickets/TicketTable.tsx` and `src/components/tickets/TicketCardList.tsx`
- [x] T032 [US5] Build `DashboardPage` with KPI cards, Recharts team status bar chart, accessible per-OM status breakdown table (`PD`), and personal priority queue (`OM`) in `src/pages/DashboardPage.tsx`

---

## Phase 8: User Story 6 - Lịch sử Thay đổi Trạng thái Chi tiết (Priority: P2)

**Goal**: Render complete, chronological immutable status timeline on every ticket detail view, including step metadata (`SKU dự kiến`, `URL`, rework reason, Group III target names) and email retry trigger if an email failed.

- [x] T033 [US6] Build `TicketHistoryTimeline` component displaying chronological audit entries, actor avatars, transition chips, and step payloads in `src/components/tickets/TicketHistoryTimeline.tsx`
- [x] T034 [US6] Integrate `emailLogs` status indicator and manual `"Gửi lại email"` retry button for `PD` in `src/pages/TicketDetailPage.tsx`

---

## Phase 9: Polish, Verification & Deployment

**Purpose**: Accessibility audit, responsive verification (`375px` & `1280px+`), documentation alignment, and GitHub Pages + Firebase/GAS setup guide

- [x] T035 [P] Update `README.md` with step-by-step setup instructions for Firebase Free, `firestore.rules`, Google Apps Script (`gas/Code.gs`), and GitHub Pages deployment
- [x] T036 Run full `npm test` (`vitest`), `npm run build` (TypeScript + Vite production bundle check), and fix any build/type/lint issues
- [ ] T037 Verify live E2E flows & responsive layouts (`375px` mobile & `1280px+` desktop) after connecting Firebase project & Google Apps Script webhook (`quickstart.md`)

---

## Dependencies & Execution Order

1. **Setup (Phase 1)** → **Foundational (Phase 2)** *(blocks all stories)*
2. **US1 (Phase 3: Auth & Roles)** → required before testing any ticket actions
3. **US2 (Phase 4: Group I)**, **US3 (Phase 5: Group II)**, **US4 (Phase 6: Group III)** build sequentially on shared `ticketService.ts` / `TicketActionPanel.tsx` (or parallelized cleanly across components once `ticketService` base lands)
4. **US5 (Phase 7: Stats & Filters)** and **US6 (Phase 8: Audit History)** finalize visibility & reporting
5. **Polish (Phase 9)** validates tests, production build, and deployment readiness.
