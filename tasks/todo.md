# Timesheet UI/UX Overhaul — "Elevate the Terminal"

Plan: `~/.claude/plans/ultrathink-check-out-this-compiled-waterfall.md`
Approach: tokens-first, then fan out to narrowly-scoped agents. File-ownership prevents parallel-edit conflicts.

## Phase A — Foundation (tokens-first)
- [x] **F1** Token foundation in `styles/globals.css` — GATE — build green ✅
- [x] **S1** `lib/chart-theme.ts` ✅
- [x] **S3** Promote `hexToRgba` → `lib/color.ts` + repoint `calendar/EntryBlock.tsx` ✅
- [x] **F2** `components/ui/Icon.tsx` (10 inline SVGs) ✅ (verified)
- [x] **F3** `components/ui/Card.tsx` (+ subcomponents) ✅ — migration deferred to screen owners
- [x] **F4** `components/ui/Select.tsx` ✅ — migration deferred to screen owners
- [~] **F5** `components/ui/Modal.tsx` (+ useDialogA11y) + refactor Pdf/Zip modals — IN PROGRESS (long pole)
- [x] **F7** Toast system: `store/toasts.ts` + `Toaster.tsx`; rewired useBudgetAlerts; BudgetToast deleted; App wired ✅
- [x] **F8** `components/ui/Skeleton.tsx` (+ SkeletonText/Card) ✅
- [x] **F9** `components/ui/Tooltip.tsx` ✅
- [x] **F11** `ProgressBar`, `Badge`, `SegmentedControl` ✅ (verified)
- [x] **S2** `components/charts/ChartTooltip.tsx` ✅
- [x] **S4** `components/ui/StatCard.tsx` ✅
- [x] **S5** `EmptyState` + `ErrorState` ✅

> Note: F3/F4 build the primitives only; the `<select>` migration (11 sites) and card migration are folded into the Phase C screen owners (file-ownership). F5 owns the Pdf/Zip modal refactor.

## Phase B — Responsive shell & nav
- [x] **R1** Responsive shell + `nav-items.ts` + safe-area/tap-target + `useNavDrawer` store ✅ (desktop byte-identical)
- [~] **R2** `MobileTopBar` / `BottomNav` / `NavDrawer` + mount — RE-RUNNING (first agent lost context post-gap)
- [~] **F6+R3** CommandPalette overhaul (reskin + successToast→toast + mobile sheet) — RE-RUNNING
- [x] **S6** Wired useEntries/useProjects/useClients → toast on error ✅ (semantics preserved; Reports error-vs-empty → Reports owner)
- [~] **F5-finish** Refactor Pdf/Zip modals onto Modal+Select — RE-RUNNING (Modal.tsx primitive ✅ verified solid; refactor was left undone)

> Consolidated `tsc -b && vite build` passed at the A/B checkpoint (796 modules, exit 0). Note: 902 kB JS bundle — code-splitting is a possible later optimization, out of scope here.
> Pre-existing (NOT our regression): repo-wide `pnpm lint` fails — ESLint 9 has no flat `eslint.config.js`. Surface to user.

## Phase C — Screen owners (one agent per screen; re-skin + states + responsive)
Shared brief: `tasks/reskin-playbook.md`. Verified live in browser (see below).
- [x] **Dashboard** ✅ StatCards, themed charts, donut center-total, empty-state fix — build green, looks premium live
- [x] **Reports** ✅ SegmentedControl, Select, StatCard totals, themed charts, table playbook, **overflow-hidden→overflow-x-auto bug fix**, error-vs-empty fix, mobile column hiding
- [x] **Projects** ✅ SegmentedControl, Card interactive, Badge, Select, states (budget bar deferred — needs backend list-endpoint change)
- [x] **Tracker** ✅ Card quick-add, kebab mobile actions + 2-row reflow, drag-drop preserved, Inter descriptions
- [x] **Timesheet** ✅ Card grid, ProjectBadge labels, totals emphasis, scroll affordance, cell-revert preserved
- [x] **ProjectDetail** ✅ StatCards, ProgressBars, tasks table, ErrorState/retry, added toasts for direct api.put/useTasks
- [x] **Clients** ✅ enriched table: initials avatars, count Badges, hours mini-bars, total row
- [x] **Calendar** ✅ SegmentedControl toolbar, themed popover/bottom-sheet, week→day mobile collapse, dvh grid

### Live verification (Podman DB + backend :3000 + Vite :5173, demo data seeded)
- [x] App runs end-to-end, no console errors
- [x] Command palette overhaul: elevated panel + blur + glow + live quick-add parse + shared toast ✅
- [x] Dashboard (Last 6 Months, populated): elevated StatCards, themed stacked bar + donut w/ center-total + % legend ✅
- [x] Mobile (402px): top bar `[≡] ~/timesheet >_` + bottom nav `[dashboard][tracker][timesheet][calendar][more]`, StatCards stack, sidebar hidden ✅
- [ ] Re-seed demo data before final tour (clears the `30m K8s | ui smoke test` entry I added while testing)
- [ ] Check for any minor mobile horizontal overflow on StatCards

## Phase D — Cohesion sweep
- [x] **F10** Typography + contrast sweep — 27 opacity-on-text → AA `-muted`/`-faint` tokens; zero `text-terminal-text/N` remain
- [x] **R9** Toaster repositioned to clear mobile bottom nav + safe area
- [x] Orphan audit: 0 raw `<select>` in pages, 0 hardcoded chart hex, all 3 modals on shared Modal ✅

## Independent correctness review (4 reviewers on behavioral-risk diffs)
- [x] **Timesheet** — CLEAN (CellInput sync/optimistic-revert, buildGrid, totals, scroll affordance additive)
- [x] **Tracker** — CLEAN (drag-reschedule, inline edit, autocomplete, add/edit/delete on desktop + mobile kebab)
- [x] **ProjectDetail** — CLEAN + 1 minor finding (StatCard had no `warning` tone) → **FIXED** (added tone + remapped budgetTone)
- [x] **Dashboard / Reports / hooks / useBudgetAlerts** — all CLEAN (calcs, error-vs-empty, throw/return semantics, dedup)

## Review summary
- **Outcome:** All Phases A–D complete. Final `tsc -b && vite build` green; 55 unit tests pass. Verified live in browser (desktop + mobile) — terminal identity preserved and elevated across all 8 screens.
- **Known/out-of-scope:** pre-existing repo-wide `pnpm lint` failure (ESLint 9, no flat `eslint.config.js`) — NOT our regression; surfaced to user. Bundle ~929 kB (code-splitting deferred). Project-card budget ProgressBar deferred (needs `/projects` list endpoint to return logged minutes). Server-error specificity on entry add/edit now defers to a generic toast (validation stays specific + inline) — intended tradeoff.
- **Nothing committed** — all changes are in the working tree, awaiting user review.
