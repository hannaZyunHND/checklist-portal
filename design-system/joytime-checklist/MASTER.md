# Design System: Joytime Checklist

> **Generated & Synthesized via UI/UX Pro Max** (`search.py --design-system`, domains: `product`, `color`, `typography`, `chart`, `ux`)
> **Target**: Internal Task & Ticket Control Web App (`PD` Manager & `OM` Operator) — Optimized for Desktop (`1024px–1440px+`) and Mobile (`375px–767px`).

---

## 1. Design Dials & Visual Direction

| Dial | Value | Meaning |
|------|-------|---------|
| **Variance** | `5/10` | Balanced / Modern — Structured SaaS workspace, clear card/table hierarchy |
| **Motion** | `4/10` | Standard — Crisp 150–200ms state transitions; respects `prefers-reduced-motion` |
| **Density** | `7/10` | Dashboard-optimized — High information clarity without cramped touch targets |

- **Primary Style**: **Flat Design + Minimalist SaaS Workspace**
  - Clean 1px structural borders (`--color-border`) instead of heavy drop shadows.
  - High surface separation between app canvas (`--color-background`) and elevated cards (`--color-card`).
  - Zero decorative emojis as structural icons — use vector SVG icons exclusively (**Lucide** or **Phosphor**, consistent `1.75px`–`2px` stroke).

---

## 2. Color Palette & Semantic Tokens

Synthesized from UI/UX Pro Max **Productivity Tool (`#0D9488` Teal Focus + `#EA580C` Action Orange)** paired with neutral SaaS surfaces and accessible **Warning (Overdue)** tokens:

### Core Surface & Brand Tokens (Light Mode Default)

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Primary** | `#0D9488` | `--color-primary` | Active nav state, primary focus ring, brand highlights |
| **On Primary** | `#FFFFFF` | `--color-on-primary` | Text/icons on `#0D9488` buttons (`contrast >= 4.5:1` with bold/semibold or darken to `#0F766E` for body text) |
| **Primary Hover** | `#0F766E` | `--color-primary-hover` | Hover state for primary interactive elements |
| **Secondary / Accent Teal** | `#14B8A6` | `--color-secondary` | Secondary badges, progress fill |
| **Action CTA** | `#EA580C` | `--color-accent` | Primary action button ("Tạo Ticket", "Golive sản phẩm") — adjusted for accessibility |
| **On Action CTA** | `#FFFFFF` | `--color-on-accent` | White text on `#C2410C` / `#EA580C` |
| **Background (Canvas)** | `#F8FAFC` | `--color-background` | App page canvas (clean slate, reduces eye fatigue vs harsh white) |
| **Foreground (Text)** | `#0F172A` | `--color-foreground` | Primary headings and body text |
| **Card Surface** | `#FFFFFF` | `--color-card` | Ticket cards, tables, modals, stat panels |
| **Muted Surface** | `#F1F5F9` | `--color-muted` | Table headers, secondary chips, disabled inputs |
| **Muted Foreground** | `#475569` | `--color-muted-foreground` | Secondary metadata, labels, timestamps (`>= 4.5:1` on `#FFFFFF`/`#F8FAFC`) |
| **Border** | `#E2E8F0` | `--color-border` | Card borders, dividers, table cell rules |
| **Focus Ring** | `#0D9488` | `--color-ring` | 2px visible focus ring on all keyboard-navigable controls |

### Semantic Status & Overdue Warning Tokens

> **Rule (UI/UX Pro Max Accessibility)**: Never encode ticket status or Overdue warning by color alone. Every badge MUST pair background + border + icon + concise Vietnamese label.

| Semantic State | Surface (`bg`) | Text (`fg` >=4.5:1) | Border | Icon |
|----------------|----------------|---------------------|--------|------|
| **Overdue Warning** | `#FEF3C7` | `#92400E` | `#F59E0B` | `AlertTriangle` |
| **Destructive / Rework** | `#FEE2E2` | `#991B1B` | `#DC2626` | `RotateCcw` / `XCircle` |
| **In Progress (OM)** | `#E0F2FE` | `#075985` | `#38BDF8` | `Clock` / `Loader` |
| **Pending PD Review** | `#EDE9FE` | `#5B21B6` | `#A78BFA` | `Eye` / `CheckSquare` |
| **Approved / Ready GoLive** | `#CCFBF1` | `#115E59` | `#14B8A6` | `Rocket` |
| **Closed / Done** | `#DCFCE7` | `#166534` | `#22C55E` | `CheckCircle2` |

### Ticket Group Badges

| Group | Label | Surface | Text |
|-------|-------|---------|------|
| Group I | `Chỉnh sửa SP cũ` | `#F1F5F9` | `#334155` |
| Group II | `Listing SP mới` | `#ECFDF5` | `#065F46` |
| Group III | `Công việc VP` | `#EFF6FF` | `#1E40AF` |

---

## 3. Typography (Vietnamese-Ready Data & UI Pairing)

From UI/UX Pro Max **Dashboard Data** pairing (`Fira Sans` + `Fira Code`, full `vietnamese` + `latin-ext` subsets):

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@400;500;600;700&display=swap');
```

| Token | Font Family | Use Case |
|-------|-------------|----------|
| `--font-sans` | `'Fira Sans', system-ui, sans-serif` | All UI labels, ticket titles, descriptions, Vietnamese copy, buttons |
| `--font-mono` | `'Fira Code', monospace` | Ticket ID (`#JT-0012`), SKU codes, deadlines, numeric KPI counts |

### Type Scale & Rules
- **Page Title (`H1`)**: `24px` (`1.5rem`), weight `700`, line-height `1.25` (Mobile: `20px`).
- **Section Heading (`H2`)**: `18px` (`1.125rem`), weight `600`, line-height `1.35`.
- **Card / Ticket Title**: `15px`–`16px`, weight `600`, line-height `1.4`.
- **Body / Description**: `14px` (`0.875rem`), weight `400`, line-height `1.5`.
- **Meta / Badge / Timestamp**: `12px` (`0.75rem`), weight `500`, `white-space: nowrap` on pills/badges.

---

## 4. Spacing, Layout & Responsive Breakpoints

Using a strict `4px / 8px` spacing rhythm:

| Breakpoint | Viewport | Navigation Pattern | Ticket List Pattern |
|------------|----------|--------------------|---------------------|
| **Mobile (Default)** | `375px–767px` | Sticky Top Bar (`56px`) + Fixed Bottom Nav (`64px` + `env(safe-area-inset-bottom)`) | Vertical **Ticket Cards** (single-column, zero horizontal overflow) |
| **Tablet** | `768px–1023px` | Compact Top Bar + Collapsible Drawer Sidebar | 2-column Card Grid or Responsive Table |
| **Desktop** | `1024px–1440px+` | Fixed Left Sidebar (`240px`) + Top Utility Header (`64px`) | **Data Table** with inline status, SKU, deadline countdown, quick action + Slide-over Detail Drawer |

### Touch & Mobile Ergonomics
- **Minimum Touch Target**: `44×44px` on all buttons, checkboxes, filter chips, and nav items on mobile.
- **Target Spacing**: Minimum `8px` (`gap-2`) between adjacent clickable buttons/chips to avoid mis-taps.
- **Scroll Behavior**: `overscroll-behavior: contain` on drawers/modals; bottom content padding `88px` on mobile so the fixed bottom nav never obscures the last ticket card.
- **Filter Chips**: Use `flex-wrap` so filter chips never clip or force horizontal page scroll.

---

## 5. Interaction, Forms & Accessibility Standards

1. **Form Validation**:
   - Validate on blur (`onBlur`) and on submit.
   - Display inline field errors directly below each input linked via `aria-describedby`.
   - On multi-field submit errors, render a focusable Error Summary banner (`role="alert"`, `tabindex="-1"`) at the top of the form with anchor links to invalid fields.
2. **State Transitions & Modals**:
   - Destructive / conditional actions (e.g., `Yêu cầu làm lại`, `Hoàn thành Listing` requiring `SKU dự kiến`, `Hoàn thành GoLive` requiring `URL sản phẩm`) open an explicit inline prompt or bottom-sheet/modal with clear field validation and confirmation.
   - Disable submit buttons while async request is in flight with a visible loading spinner + Vietnamese label (`Đang xử lý...`), preventing duplicate submissions.
3. **Charts & Data Visualization**:
   - Use **Horizontal / Grouped Bar Charts** (via Chart.js / Recharts or clean accessible SVG bars) for team status breakdown and per-OM workload.
   - Always accompany charts with a visible, keyboard-sortable **Data Table** summary so exact numbers and accessibility are preserved on both mobile and desktop.
4. **Reduced Motion**:
   - Wrap transitions/stagger animations in `@media (prefers-reduced-motion: reduce)` so animations resolve immediately when requested by the OS.

---

## 6. Anti-Patterns to Avoid

- Wide multi-column tables forced onto `375px` mobile screens causing horizontal page scroll.
- Relying on red/amber background color alone without an Overdue icon + text (`Quá hạn`).
- Mixing emoji icons (`🔥`, `✅`) with SVG icons in navigation or status pills.
- Removing browser `:focus-visible` outlines without a `2px` `--color-ring` replacement.
- Placing primary `Tạo Ticket` or `Hoàn thành` actions where mobile thumbs cannot comfortably reach them.
