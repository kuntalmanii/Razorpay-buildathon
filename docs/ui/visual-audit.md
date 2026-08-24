# RecoverIQ Frontend Visual & UX Audit

**Date:** August 24, 2026  
**Audit Type:** Read-Only Visual, Design System, & Component Architecture Audit  
**Design Target:** Premium Editorial Fintech — Calm, Trustworthy, Operational, High Information Density.

---

## 1. Executive Summary

RecoverIQ currently has fully implemented, verified business logic across all 5 operational screens. However, the current visual implementation relies on a **generic dark AI SaaS template aesthetic** (cool blue-slate blacks `#0D0F12` / `#13161C`, high-saturation neon amber `#F59E0B`, electric blue `#3B82F6`, bright purple `#8B5CF6`, and heavy glow shadows).

To transition RecoverIQ into a **world-class, bespoke fintech operational terminal** aligned with the Razorpay Buildathon visual language, the interface must adopt a **warm, muted, editorial color palette** with quiet borders, restrained typography, and functional hierarchy.

---

## 2. Palette Transformation Plan

| Role | Current Hex / Style | Proposed Target Hex | Usage Scope |
|---|---|---|---|
| **Background** | `#0D0F12` / `#0F1117` (Cool Slate Black) | `#151513` (Deep Warm Charcoal) | Application canvas, root body background |
| **Surface** | `#13161C` / `#141820` (Dark Blue-Grey) | `#1C1B18` (Warm Slate Surface) | Standard cards, sidebar, table rows, panel backgrounds |
| **Elevated** | `#1F242E` / `#282E3B` (Cool Elevated Grey) | `#24221E` (Warm Elevated Slate) | Modals, dropdowns, tooltips, nested highlight cards |
| **Primary Text** | `#F3F4F6` (Stark Cool White) | `#F2EDE3` (Warm Ivory White) | Headers, metric numbers, primary titles |
| **Secondary Text** | `#D1D5DB` / `#A8A29E` (Stone 300/400) | `#B7B0A3` (Muted Warm Sand) | Body copy, descriptions, subheadings |
| **Muted Text** | `#78716C` (Stone 500) | `#817A70` (Warm Clay Muted) | Micro-copy, timestamps, table column headers |
| **Accent (Gold)** | `#F59E0B` (Neon Amber) | `#B89A62` (Refined Antique Gold) | Primary CTA buttons, key highlight badges, KPI trends |
| **Accent Soft** | `#FEF3C7` / `#FBBF24` (Bright Yellow) | `#D1B982` (Soft Champagne Gold) | Secondary accents, subtle hover states, link highlights |
| **Success** | `#10B981` (Electric Emerald) | `#6F9B7A` (Sage Green) | Recovered status, verified policy, approved actions |
| **Warning** | `#F59E0B` (Bright Orange) | `#B68B4F` (Warm Ochre) | Pending human approvals, cooldown wait states |
| **Danger** | `#EF4444` (Vibrant Red) | `#B56F68` (Muted Terracotta Rose) | Payment failures, policy violations, technical errors |
| **Info** | `#3B82F6` (Electric Blue) | `#71879A` (Muted Slate Steel) | System telemetry, diagnostic metadata, timeline events |
| **Borders** | `#1E232E` / `#232733` (High Contrast Blue) | `rgba(242,237,227,0.10)` | Quiet, cohesive 1px structural dividing lines |

---

## 3. Systematic Findings by Category

### 1. Color System & Hardcoded Values
- **CURRENT PROBLEM:** Hardcoded hex values are scattered across 18+ component files (e.g., `#13161C`, `#0F1117`, `#1E232E`, `#232733`, `#282E3B`, `#181C24`). Recharts components in `command-center.tsx` and `evaluation-dashboard.tsx` embed neon hex values (`#F59E0B`, `#3B82F6`, `#10B981`, `#8B5CF6`, `#EF4444`).
- **DESIRED CHANGE:** Centralize the new palette in `tailwind.config.ts` and `src/styles/globals.css`. Define semantic CSS variables and Tailwind utility classes (`bg-background`, `bg-surface`, `bg-elevated`, `text-primary-text`, `text-secondary-text`, `text-muted-text`, `border-border-subtle`, `text-accent-gold`, etc.).
- **FILES AFFECTED:**
  - `frontend/tailwind.config.ts`
  - `frontend/src/styles/globals.css`
  - `frontend/src/components/ui/badge.tsx`
  - `frontend/src/components/ui/button.tsx`
  - `frontend/src/components/ui/card.tsx`
  - `frontend/src/features/dashboard/command-center.tsx`
  - `frontend/src/features/evaluation/evaluation-dashboard.tsx`
- **RISK OF REGRESSION:** Very Low. Semantic mapping preserves all existing component structures.

---

### 2. Typography & Hierarchy
- **CURRENT PROBLEM:** Font sizes are fragmented (`text-[10px]`, `text-[11px]`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`). Numbers in metric cards lack monospace font alignment, causing subtle horizontal jitter during data refreshes.
- **DESIRED CHANGE:** Standardize typography scale:
  - Large KPIs: `text-2xl font-bold font-mono tracking-tight text-[#F2EDE3]`
  - Section Titles: `text-base font-semibold text-[#F2EDE3]`
  - Card Titles / Row Headers: `text-sm font-medium text-[#F2EDE3]`
  - Body Text: `text-xs text-[#B7B0A3] leading-relaxed`
  - Meta / Timestamps / Badges: `text-[11px] font-mono text-[#817A70]`
- **FILES AFFECTED:** All files in `frontend/src/features/` and `frontend/src/components/layout/`.
- **RISK OF REGRESSION:** Very Low.

---

### 3. Cards & Surface Containers
- **CURRENT PROBLEM:** Cards currently use heavy dark blue backgrounds (`#13161C`) with harsh border `#232733` and generic drop shadows (`shadow-card`, `shadow-[0_0_25px_rgba(245,158,11,0.15)]`). Some views contain nested cards creating visual "box inside a box" clutter.
- **DESIRED CHANGE:** Simplify card styling to `bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-xl`. Remove heavy glow shadows in favor of subtle border highlights (`border-[#B89A62]/30`).
- **FILES AFFECTED:** `frontend/src/components/ui/card.tsx`, `frontend/src/features/dashboard/command-center.tsx`.
- **RISK OF REGRESSION:** Very Low.

---

### 4. Buttons & Interactive Elements
- **CURRENT PROBLEM:** Primary button currently uses high-saturation `bg-amber-500 hover:bg-amber-400 text-stone-950` with an animated neon glow box-shadow (`hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]`), which feels like an esports/crypto dashboard rather than institutional fintech.
- **DESIRED CHANGE:** Style primary buttons with refined antique gold `#B89A62` (hover `#D1B982`), crisp text `#151513`, `font-semibold text-xs tracking-wide`. Style secondary/outline buttons with `#1C1B18` surface, `border-[rgba(242,237,227,0.10)]`, hover `bg-[#24221E]`.
- **FILES AFFECTED:** `frontend/src/components/ui/button.tsx`, `frontend/src/components/demo/judge-demo-bar.tsx`.
- **RISK OF REGRESSION:** Low.

---

### 5. Badges & 3-Tier Visual Distinction
- **CURRENT PROBLEM:** Badges in `badge.tsx` use saturated Tailwind color classes (`bg-amber-500/10 text-amber-400`, `bg-blue-500/10 text-blue-400`, `bg-purple-500/10 text-purple-400`).
- **DESIRED CHANGE:** Map badge variants directly to the new calm palette:
  - `gold` (AI Recommendation): `bg-[#B89A62]/10 text-[#D1B982] border-[#B89A62]/20`
  - `emerald` (Policy Approved / Recovered): `bg-[#6F9B7A]/10 text-[#6F9B7A] border-[#6F9B7A]/20`
  - `rose` (Blocked / Failed): `bg-[#B56F68]/10 text-[#B56F68] border-[#B56F68]/20`
  - `blue` (Telemetry / Ingress): `bg-[#71879A]/10 text-[#71879A] border-[#71879A]/20`
  - `neutral`: `bg-[#24221E] text-[#B7B0A3] border-[rgba(242,237,227,0.10)]`
- **FILES AFFECTED:** `frontend/src/components/ui/badge.tsx`.
- **RISK OF REGRESSION:** Very Low.

---

### 6. Tables & Data Grids
- **CURRENT PROBLEM:** Table row borders use `#1E232E`. Hover states vary between `hover:bg-[#151922]` and `hover:bg-[#181C24]`.
- **DESIRED CHANGE:** Table header uses `bg-[#181714] text-[#817A70] text-[11px] font-mono uppercase tracking-wider`. Table rows use `border-b border-[rgba(242,237,227,0.06)] hover:bg-[#24221E]/60 transition-colors`.
- **FILES AFFECTED:**
  - `frontend/src/features/recovery-cases/recovery-cases-list.tsx`
  - `frontend/src/features/dashboard/command-center.tsx`
- **RISK OF REGRESSION:** Very Low.

---

### 7. Sidebar & Header Layout
- **CURRENT PROBLEM:**
  - Sidebar uses `#0F1117` background with `#1E232E` borders and a neon gold zap icon.
  - Header uses `#0F1117]/80` backdrop.
- **DESIRED CHANGE:**
  - Sidebar: `bg-[#181714] border-r border-[rgba(242,237,227,0.08)]`. Active navigation pill: `bg-[#B89A62]/10 text-[#D1B982] border border-[#B89A62]/25`.
  - Header: `bg-[#151513]/90 backdrop-blur-md border-b border-[rgba(242,237,227,0.08)]`.
- **FILES AFFECTED:**
  - `frontend/src/components/layout/sidebar.tsx`
  - `frontend/src/components/layout/header.tsx`
  - `frontend/src/components/layout/system-status-drawer.tsx`
- **RISK OF REGRESSION:** Low.

---

### 8. Analytics & Recharts Charts
- **CURRENT PROBLEM:** Charts use neon gradient fills (`#F59E0B` to transparent, `#3B82F6` to transparent) with white grid lines.
- **DESIRED CHANGE:**
  - Area chart fills: Subtle gradient from `#B89A62` (opacity 0.2) to `#B89A62` (opacity 0.0).
  - Bar chart fills: Categorical palette `#B89A62` (Accent), `#6F9B7A` (Success), `#71879A` (Info), `#B68B4F` (Warning), `#B56F68` (Danger).
  - Chart CartesianGrid: `stroke="rgba(242,237,227,0.05)" strokeDasharray="3 3"`.
  - Tooltips: `bg-[#1C1B18] border border-[rgba(242,237,227,0.15)] text-[#F2EDE3] text-xs shadow-xl`.
- **FILES AFFECTED:**
  - `frontend/src/features/dashboard/command-center.tsx`
  - `frontend/src/features/evaluation/evaluation-dashboard.tsx`
- **RISK OF REGRESSION:** Low.

---

### 9. Interactive Judge Demo Bar
- **CURRENT PROBLEM:** Floating pill button has a neon gradient (`from-amber-500 to-amber-600`) and intense yellow glow shadow (`shadow-[0_0_25px_rgba(245,158,11,0.4)]`).
- **DESIRED CHANGE:** Restyle to a discreet, high-polish floating button: `bg-[#B89A62] hover:bg-[#D1B982] text-[#151513] font-semibold text-xs shadow-lg border border-[#D1B982]/30`. Inside modal: Use warm `#1C1B18` surface and `#24221E` elevated step cards.
- **FILES AFFECTED:** `frontend/src/components/demo/judge-demo-bar.tsx`.
- **RISK OF REGRESSION:** Very Low.

---

### 10. States (Loading, Empty, Error)
- **CURRENT PROBLEM:**
  - `Skeleton` pulses with cool slate `#1F242E`.
  - `EmptyState` uses `#13161C]/50` with `#232733` dashed border.
  - `ErrorState` uses bright red `bg-rose-500/5 border-rose-500/20`.
- **DESIRED CHANGE:**
  - `Skeleton`: `bg-[#24221E] animate-pulse rounded-md`.
  - `EmptyState`: `bg-[#1C1B18]/60 border border-dashed border-[rgba(242,237,227,0.12)] text-[#B7B0A3]`.
  - `ErrorState`: `bg-[#B56F68]/10 border border-[#B56F68]/20 text-[#B56F68]`.
- **FILES AFFECTED:**
  - `frontend/src/components/ui/skeleton.tsx`
  - `frontend/src/components/ui/empty-state.tsx`
  - `frontend/src/components/ui/error-state.tsx`
- **RISK OF REGRESSION:** Zero.

---

## 4. Components & Reusability Matrix

| Component | Location | Role & Reusability |
|---|---|---|
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` | `src/components/ui/card.tsx` | Core container across all 5 screens |
| `Badge` | `src/components/ui/badge.tsx` | Status and tier indicator |
| `Button` | `src/components/ui/button.tsx` | All actionable triggers and dialog buttons |
| `MetricTooltip` | `src/components/ui/tooltip.tsx` | Formula explanation tooltips across KPIs |
| `Skeleton`, `CardSkeleton`, `TableRowSkeleton` | `src/components/ui/skeleton.tsx` | Unified loading states across all views |
| `EmptyState` | `src/components/ui/empty-state.tsx` | Zero-data states for tables and feeds |
| `ErrorState` | `src/components/ui/error-state.tsx` | Resilient network/API error recovery |
| `SystemStatusDrawer` | `src/components/layout/system-status-drawer.tsx` | Real-time subsystem telemetry |
| `JudgeDemoBar` | `src/components/demo/judge-demo-bar.tsx` | Live scenario execution trigger |

---

## 5. Non-Destructive Phased Implementation Roadmap

When authorized to apply visual updates, the execution will strictly follow this order without altering business logic or API contracts:

1. **Phase 1 — Design Tokens Foundation:**
   - Update `frontend/tailwind.config.ts` and `frontend/src/styles/globals.css` with the 12 warm palette tokens and subtle scrollbars.
2. **Phase 2 — UI Primitive Components:**
   - Update `card.tsx`, `button.tsx`, `badge.tsx`, `skeleton.tsx`, `empty-state.tsx`, `error-state.tsx`, `tooltip.tsx`.
3. **Phase 3 — Shell & Navigation:**
   - Update `sidebar.tsx`, `header.tsx`, `system-status-drawer.tsx`, `judge-demo-bar.tsx`.
4. **Phase 4 — Operational Feature Screens:**
   - Update `command-center.tsx`, `recovery-cases-list.tsx`, `recovery-case-detail.tsx`, `ai-decisions-feed.tsx`, `case-decision-deep-dive.tsx`, `audit-timeline.tsx`, `evaluation-dashboard.tsx`.
5. **Phase 5 — Build & Regression Verification:**
   - Run `npm run typecheck`, `npm run lint`, `npm run build` in `frontend/` to confirm 100% clean compilation.
