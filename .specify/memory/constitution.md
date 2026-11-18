<!--
Sync Impact Report:
- Version change: template -> 1.0.0
- Modified principles: Initialized 5 project principles from template
- Added sections: Technical & Deployment Constraints, Development & Quality Workflow
- Removed sections: None
- Follow-up TODOs: None
-->
# Joytime Checklist Constitution

## Core Principles

### I. Fixed Workflow Simplicity (YAGNI)
Business workflows for the three ticket categories (`Chỉnh sửa sản phẩm cũ`, `Listing sản phẩm mới`, and `Công việc văn phòng`) MUST remain explicit, deterministic state machines rather than dynamic or user-configurable workflow builders. Every status transition, required input field, and role action MUST be encoded directly and clearly so the codebase stays small, predictable, and easy to maintain.

### II. Role-Based Access & Audit Integrity
Every action in the system MUST enforce strict separation between `PD` (Cấp quản lý / Manager) and `OM` (Cấp thực hiện / Operations Member), both in the UI and in data-access rules. Every ticket creation and status change MUST append an immutable history entry recording timestamp, actor, previous status, new status, and optional notes/payload (such as SKU, URL, or rework reason).

### III. Responsive Desktop & Mobile Parity
All core user journeys (sign-in, creating tickets, completing tickets with required fields, approving/rejecting, viewing statistics, and checking overdue warnings) MUST operate cleanly on both desktop viewports (≥1024px) and mobile viewports (375px+). Interactive controls MUST meet touch-target minimums (≥44×44px on mobile) and support keyboard navigation and 4.5:1 text contrast.

### IV. Static-First Free-Tier Architecture
Deployment MUST prioritize a zero-cost static frontend (GitHub Pages with a modern JS framework) paired with Firebase Free Tier (Firebase Auth + Firebase Firestore/Realtime Database) wherever all functional requirements—including automated email notifications—can be satisfied reliably. A self-hosted `.NET + JS Framework + SQLite` fallback is permitted only if static/free-tier constraints block a mandatory requirement (such as reliable SMTP email delivery) and MUST be explicitly approved before implementation.

### V. Spec-Driven & State-Machine Verification
No feature implementation begins until specification ambiguities are resolved, the implementation plan is approved, and UI/UX design tokens are documented. All state transitions, multi-assignee completion aggregation (Group III), overdue date calculations, and role visibility filters MUST be covered by automated unit/integration tests before release.

## Technical & Deployment Constraints

- **Target Platforms**: Modern desktop browsers (Chrome, Edge, Safari) and mobile browsers (iOS Safari, Android Chrome), responsive from `375px` to `1440px+`.
- **Language & Localization**: Primary UI copy, labels, statuses, and notifications MUST be in clear Vietnamese aligned with Joytime team terminology.
- **Data Privacy & Security**: Staff emails, profile data, and ticket records MUST only be accessible to authenticated team members; `OM` users MUST only read/update tickets assigned to them and their own personal statistics.
- **Design System Compliance**: All UI components, colors, typography, spacing, and interaction patterns MUST adhere to `design-system/joytime-checklist/MASTER.md` and its page-level specifications.

## Development & Quality Workflow

- **Documentation First**: Maintain `specs/` via Spec Kit (`/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks`) and UI specifications under `design-system/joytime-checklist/`.
- **Incremental Delivery**: Build foundation (Auth, Roles, Layout) first, then deliver each ticket workflow and statistics module as independently testable slices.
- **Pre-Release Gate**: Verify responsive layouts at `375px` and `1280px+`, contrast and focus accessibility, state-transition integrity, and email notification triggers before marking any milestone complete.

## Governance

This constitution supersedes ad-hoc design or implementation decisions. Amendments MUST update this file, bump the semantic version (`MAJOR` for principle removal/redefinition, `MINOR` for new principles/constraints, `PATCH` for clarifications), and keep `specs/` and `design-system/` aligned. All planning reviews and implementation checks MUST verify compliance with Principles I–V.

**Version**: 1.0.0 | **Ratified**: 2026-11-18 | **Last Amended**: 2026-11-18
