# Implementation Plan: Joytime Checklist (Hệ thống Kiểm soát Task Công việc)

**Branch**: `001-ticket-task-control` | **Date**: 2026-11-18 | **Spec**: [spec.md](file:///d:/WORKING/CHECKLIST_JOYTIME_MINH/specs/001-ticket-task-control/spec.md)

**Input**: Feature specification from `specs/001-ticket-task-control/spec.md` and UI/UX Design System from `design-system/joytime-checklist/MASTER.md`.

## Summary

Build a responsive, zero-cost task & ticket control web application optimized for both desktop and mobile browsers, deployed statically on **GitHub Pages** and backed by **Firebase Free Tier (Auth + Cloud Firestore)** plus a **Google Apps Script Web App** for automated step-by-step email notifications. The system enforces strict `PD` (Manager) and `OM` (Operator) role separation across three deterministic ticket workflows (`Chỉnh sửa sản phẩm cũ`, `Listing sản phẩm mới`, `Công việc văn phòng`), maintains an immutable status-change history timeline, computes team/personal statistics with `Overdue` warning indicators, and adheres strictly to the UI/UX Pro Max design system.

## Technical Context

**Language/Version**: TypeScript 5.x + React 19 + Vite 6  
**Primary Dependencies**: `react-router-dom` (`HashRouter`), `firebase` (v11 Modular SDK: Auth + Firestore), `tailwindcss` v4, `lucide-react`, `recharts` (responsive SVG charts)  
**Storage**: Cloud Firestore (Spark Free Plan) + client-side resized Base64 avatars (`<= 80KB`)  
**Email Integration**: Google Apps Script Web App (`MailApp.sendEmail` via `POST text/plain`) + Firestore `emailLogs` audit trail  
**Testing**: `vitest` + `@testing-library/react` (covering deterministic state machines, Group III multi-assignee transactions, overdue logic, and stats aggregation)  
**Target Platform**: GitHub Pages static web app (Desktop `1024px–1440px+` & Mobile `375px–767px`)  
**Project Type**: Single-page web application (`SPA`)  
**Performance Goals**: Instant real-time UI sync (`< 2s`), client-side statistics aggregation `< 10ms`, bundle optimized with route code-splitting  
**Constraints**: 100% Free-tier operation (no Firebase Blaze / no paid backend required), strict `UTC+7` (`Asia/Ho_Chi_Minh`) deadline formatting, touch targets `>= 44×44px` on mobile  
**Scale/Scope**: Internal team 5–50 users, 3 fixed ticket workflows, 5 primary views (`Auth`, `Dashboard`, `Tickets`, `Ticket Detail`, `Profile` + `Team` for `PD`)

## Constitution Check

*GATE: Passed pre-research and post-design.*

- **I. Fixed Workflow Simplicity (YAGNI)**: PASS — Pure deterministic state machine module (`ticketTransitions.ts`) handles Group I, II, III without any dynamic workflow engine.
- **II. Role-Based Access & Audit Integrity**: PASS — Dual enforcement via React route/action guards + `firestore.rules`; every transition appends an immutable document in `tickets/{id}/history`.
- **III. Responsive Desktop & Mobile Parity**: PASS — Desktop Sidebar + Data Table vs Mobile Bottom Nav + Card List + Bottom-Sheet Filters/Actions defined in `design-system/joytime-checklist/`.
- **IV. Static-First Free-Tier Architecture**: PASS — GitHub Pages + Firebase Spark (Auth + Firestore) + Google Apps Script email webhook; zero billing card required.
- **V. Spec-Driven & State-Machine Verification**: PASS — Dedicated `vitest` unit test suite planned for all state transitions, Group III partial/full/selective-rework logic, and Overdue/Stats calculations.

## Project Structure

### Documentation (this feature)

```text
specs/001-ticket-task-control/
├── spec.md                                  # Clarified business specification
├── plan.md                                  # This file
├── research.md                              # Architecture, Firebase Free & GAS email research
├── data-model.md                            # Firestore schema & state transition tables
├── quickstart.md                            # Setup, Firebase/GAS config & E2E validation
├── checklists/
│   └── requirements.md                      # Spec quality checklist
├── contracts/
│   └── firestore-and-apps-script.md         # GAS email payload, Firestore Rules & service contracts
└── tasks.md                                 # Actionable phase/story task breakdown

design-system/joytime-checklist/
├── MASTER.md                                # UI/UX Pro Max global tokens & rules
└── pages/
    ├── auth.md
    ├── dashboard.md
    ├── tickets.md
    ├── ticket-detail.md
    ├── profile.md
    └── team.md
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── deploy.yml                           # GitHub Pages build & deploy workflow

gas/
└── Code.gs                                  # Ready-to-paste Google Apps Script email webhook

firestore.rules                              # Role-scoped & state-safe Firestore security rules
firestore.indexes.json                       # Composite indexes for assigneeIds + updatedAt/status
package.json
vite.config.ts
index.html
src/
├── main.tsx
├── App.tsx                                  # HashRouter & Auth/Role protected routes
├── index.css                                # Tailwind v4 + UI/UX Pro Max CSS design tokens
├── types/
│   ├── user.ts
│   └── ticket.ts
├── config/
│   └── firebase.ts                          # Firebase app, Auth, Firestore initialization
├── contexts/
│   └── AuthContext.tsx                      # Auth state, user profile subscription, role helpers
├── domain/
│   ├── ticketStateMachine.ts                # Pure deterministic transitions for Group I, II, III
│   ├── ticketStats.ts                       # Overdue calculation, team & personal stats aggregation
│   └── ticketStateMachine.test.ts           # Vitest unit tests for all workflows & edge cases
├── services/
│   ├── authService.ts                       # Register (default OM / PD bootstrap), login, profile, avatar compression
│   ├── ticketService.ts                     # Firestore CRUD, atomic transactions, history logging
│   ├── emailService.ts                      # Google Apps Script webhook trigger & emailLogs writer
│   └── userService.ts                       # Team directory & PD role management
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx                     # Desktop Sidebar + Mobile TopBar/BottomNav
│   │   └── ProtectedRoute.tsx
│   ├── ui/
│   │   ├── StatusBadge.tsx                  # Icon + label + accessible contrast badges & Overdue warning pill
│   │   ├── UserAvatar.tsx
│   │   ├── ModalOrSheet.tsx                 # Centered modal on desktop, bottom sheet on mobile
│   │   └── ErrorSummary.tsx                 # Focusable validation summary (UI/UX Pro Max a11y)
│   └── tickets/
│       ├── CreateTicketModal.tsx            # 3-group dynamic fixed-schema form (PD only)
│       ├── TicketTable.tsx                  # Desktop data table with overdue row highlight
│       ├── TicketCardList.tsx               # Mobile touch-friendly card list
│       ├── TicketFilterBar.tsx              # Desktop bar + Mobile bottom-sheet filters
│       ├── TicketActionPanel.tsx            # Role + step-specific forms (SKU, URL, targeted rework)
│       ├── TicketStepper.tsx                # Visual workflow progress indicator
│       └── TicketHistoryTimeline.tsx        # Immutable audit trail viewer
└── pages/
    ├── AuthPage.tsx
    ├── DashboardPage.tsx                    # PD team stats/charts vs OM personal priority view
    ├── TicketsPage.tsx
    ├── TicketDetailPage.tsx
    ├── ProfilePage.tsx
    └── TeamPage.tsx                         # PD-only member role management & invite code config
```

**Structure Decision**: Single-project Vite React TypeScript SPA at repository root with clear separation between pure domain logic (`src/domain/`), Firebase/GAS integration (`src/services/`), reusable UI primitives (`src/components/`), and route pages (`src/pages/`), plus `gas/Code.gs` and `firestore.rules` included in repo for turnkey setup.

## Complexity Tracking

> No Constitution violations. No extra complexity layers introduced.
