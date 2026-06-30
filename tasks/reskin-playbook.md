# Screen Re-skin Playbook (Phase C)

You are a **screen owner**: re-skin ONE page onto the new design system, add proper states, and make it responsive — **without changing behavior, data flow, routes, or the desktop interaction model.** No new features, no flow consolidation. Edit ONLY your assigned page file (and its same-file private subcomponents). Do NOT edit other pages or shared components.

## Available primitives (import from `pages/` as `../components/...`)
- `../components/ui/Card` → `Card` { elevated, glow, interactive, accent, padding:'none'|'sm'|'md'|'lg', as } + `CardHeader/CardTitle/CardBody/CardFooter`
- `../components/ui/StatCard` → `StatCard` { label, value, sub?, trend?:{value,direction:'up'|'down'|'flat'}, tone?:'bright'|'green'|'danger'|'blue'|'muted', accentColor? } — _in a flex row of StatCards, give row items `min-w-0` so truncate works._
- `../components/ui/Badge` → `Badge` { variant:'default'|'success'|'info'|'warning'|'danger'|'muted' }
- `../components/ui/SegmentedControl` → `SegmentedControl` { options:[{value,label}], value, onChange }
- `../components/ui/ProgressBar` → `ProgressBar` { value, max?, color? }
- `../components/ui/Select` → `Select` { label?, error?, options?|children, value, onChange, ... } (styled native select)
- `../components/ui/Skeleton` → `Skeleton`, `SkeletonText`, `SkeletonCard`
- `../components/ui/EmptyState` → `EmptyState` { prompt, message?, action?:{label,onClick}, variant?:'default'|'chart' }
- `../components/ui/ErrorState` → `ErrorState` { message?, onRetry? }
- `../components/ui/Tooltip` → `Tooltip` { content, side?, children }
- `../components/ui/Icon` → `Icon` { name, size? } — names: chevron-down|chevron-right|close|check|cross|search|external-link|download|spinner|alert
- `../components/ui/Button`, `../components/ui/Input` (existing), `../components/ProjectBadge` (existing project dot+name)
- Toast: `import { toast } from '../store/toasts'` → `toast({ variant:'success'|'danger'|'info'|'warning', message })`
- Charts only: `../lib/chart-theme` (`chart`, `CHART_PALETTE`, `axisTick`, `gridProps`, `barCursor`) + `../components/charts/ChartTooltip`
- Color util: `../lib/color` (`hexToRgba`)

## Re-skin moves (apply consistently)
1. **Cards:** every `bg-terminal-bg-light border border-terminal-border rounded(-lg) p-4` → `<Card>`. Primary panels/KPIs → `<Card elevated>`. Inline create/edit panels (the green-left-border ones) → `<Card accent>` and KEEP them inline (do not move into Modal). Clickable cards → `<Card interactive>`.
2. **Section headers:** in-card `<h2 class="text-terminal-text-bright font-mono text-sm font-bold">` → a small uppercase mono label: `text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]`, optionally a green `#`/`$` glyph prefix. Page `<h1>` keeps its `.page-heading` `$ ` prefix.
3. **Tables:** header row `bg-terminal-surface text-[11px] font-mono uppercase tracking-wide text-terminal-text-muted px-4 py-3`; body rows keep existing hover + add `focus-visible` ring; **numeric columns right-aligned + `font-data`** (tabular-nums); wrap the table in `<Card padding="none" className="overflow-hidden">`; footer/total row `bg-terminal-surface`.
4. **Pills & toggles:** status/billable pills → `<Badge>`; tab/filter/range/view button groups → `<SegmentedControl>`; progress bars → `<ProgressBar>`; project dot+name → `ProjectBadge`; native `<select>` → `<Select>`.
5. **Micro-interactions:** `transition-all duration-150`; `active:translate-y-px` on buttons/clickable cards; `focus-visible:ring-1 focus-visible:ring-terminal-green/60` on interactive elements; mount main content with `animate-fade-in`.
6. **Typography (mono vs Inter):** KEEP MONO for chrome, labels, KPI numbers, all table cells, durations/hours/currency, dates, badges, `$`/`[]` motifs. Switch to **Inter (`font-prose` / `text-body`)** ONLY for human prose: entry descriptions, activity text, client addresses, empty-state sentences. Numbers/labels inside those stay mono (`font-data`).
7. **Contrast:** never use bare `text-terminal-text/30|40|50` for meaningful text → use `text-terminal-text-muted` (AA) or `-faint` for non-essential chrome only.

## States (replace the plain "loading…"/empty/error text)
- **Loading** → shape-matched skeletons for THIS screen (`SkeletonCard` for KPIs/cards, table-row skeletons, chart-rect skeletons).
- **Empty** → `<EmptyState prompt="..." message="..." action={{label,onClick}}/>` — terminal-flavored (`$ no entries`, a short Inter sentence, a primary action).
- **Fetch error** → `<ErrorState onRetry={<the fetch fn>}/>` (the data stores now also expose `error` + toast on failure).
- **Mutations:** the data stores already fire a danger `toast()` on fetch/mutation failure. So: add **success** toasts where genuinely useful; for failures, **prefer the toast** and keep INLINE errors only for **validation** (e.g. "end time must be after start") — avoid double-surfacing the same network/save error both inline and as a toast.

## Hard constraints
- Behavior, data flow, routes, handlers, and the desktop interaction model stay the SAME. Only presentation/markup/classes change + states added + responsive classes added.
- Keep the terminal soul: `$ ` headings, `[bracket]` labels, neon green/blue accents, cursor motifs.
- Preserve external props/exports of anything other files import.
- Desktop (≥md) should look like an elevated version of today — verify against the baseline screenshots in `assets/` if unsure.

## Acceptance
`cd /Users/ydixken/development/cluster.fail/timesheet && pnpm --filter @timesheet/frontend build` exits 0 (full tsc -b + vite build). Ignore transient errors only in files owned by a concurrent teammate. Confirm the page's data still loads/renders and report the changes.
