import type { EntryWithProject } from '../types'

// ── Constants ──
export const HOUR_HEIGHT_DEFAULT = 60  // px per hour
export const MIN_ENTRY_HEIGHT = 20     // px
export const DEFAULT_SCROLL_HOUR = 7   // 07:00

// ── Types ──
export interface PositionedEntry {
  entry: EntryWithProject
  top: number       // px from grid top
  height: number    // px
  column: number    // 0-based overlap column
  totalColumns: number
}

// ── Core Functions ──

/** "09:30" → 570 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Compute top/height for a single entry */
export function computeEntryPosition(
  startTime: string,
  endTime: string | null,
  durationMin: number,
  hourHeight: number,
): { top: number; height: number } {
  const startMin = timeToMinutes(startTime)
  const top = (startMin / 60) * hourHeight

  let durationMinutes: number
  if (endTime) {
    durationMinutes = timeToMinutes(endTime) - startMin
    if (durationMinutes <= 0) durationMinutes = durationMin // fallback
  } else {
    durationMinutes = durationMin
  }

  const height = Math.max((durationMinutes / 60) * hourHeight, MIN_ENTRY_HEIGHT)
  return { top, height }
}

/** Full overlap layout for a day's scheduled entries using sweep-line algorithm */
export function computeOverlapLayout(
  entries: EntryWithProject[],
  hourHeight: number,
): PositionedEntry[] {
  // Filter to entries with startTime
  const scheduled = entries.filter(e => e.startTime !== null)
  if (scheduled.length === 0) return []

  // Sort by startTime ascending, then by durationMin descending (longer entries get left columns)
  scheduled.sort((a, b) => {
    const aStart = timeToMinutes(a.startTime!)
    const bStart = timeToMinutes(b.startTime!)
    if (aStart !== bStart) return aStart - bStart
    return b.durationMin - a.durationMin
  })

  // Compute positions and assign columns
  interface ColumnInfo {
    latestEnd: number
    entries: number[] // indices into scheduled array
  }

  const columns: ColumnInfo[] = []
  const entryColumns: number[] = []
  const entryPositions: { top: number; height: number; startMin: number; endMin: number }[] = []

  for (let i = 0; i < scheduled.length; i++) {
    const entry = scheduled[i]
    const { top, height } = computeEntryPosition(
      entry.startTime!,
      entry.endTime,
      entry.durationMin,
      hourHeight,
    )
    const startMin = timeToMinutes(entry.startTime!)
    let endMin: number
    if (entry.endTime) {
      endMin = timeToMinutes(entry.endTime)
      if (endMin <= startMin) endMin = startMin + entry.durationMin
    } else {
      endMin = startMin + entry.durationMin
    }

    entryPositions.push({ top, height, startMin, endMin })

    // Find first column where latestEnd <= startMin
    let placed = false
    for (let c = 0; c < columns.length; c++) {
      if (columns[c].latestEnd <= startMin) {
        columns[c].latestEnd = endMin
        columns[c].entries.push(i)
        entryColumns.push(c)
        placed = true
        break
      }
    }
    if (!placed) {
      columns.push({ latestEnd: endMin, entries: [i] })
      entryColumns.push(columns.length - 1)
    }
  }

  // Build connected components (overlap groups)
  // Two entries overlap if their time ranges intersect
  const parent = Array.from({ length: scheduled.length }, (_, i) => i)

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }

  function union(a: number, b: number) {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }

  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      // Two entries overlap if one starts before the other ends
      if (entryPositions[i].startMin < entryPositions[j].endMin &&
          entryPositions[j].startMin < entryPositions[i].endMin) {
        union(i, j)
      }
    }
  }

  // Compute totalColumns per group
  const groupMaxCol = new Map<number, number>()
  for (let i = 0; i < scheduled.length; i++) {
    const root = find(i)
    const current = groupMaxCol.get(root) ?? 0
    groupMaxCol.set(root, Math.max(current, entryColumns[i] + 1))
  }

  // Build result
  return scheduled.map((entry, i) => ({
    entry,
    top: entryPositions[i].top,
    height: entryPositions[i].height,
    column: entryColumns[i],
    totalColumns: groupMaxCol.get(find(i))!,
  }))
}

/** Split entries into { scheduled, unscheduled } */
export function splitScheduledUnscheduled(
  entries: EntryWithProject[],
): { scheduled: EntryWithProject[]; unscheduled: EntryWithProject[] } {
  const scheduled: EntryWithProject[] = []
  const unscheduled: EntryWithProject[] = []
  for (const entry of entries) {
    if (entry.startTime) {
      scheduled.push(entry)
    } else {
      unscheduled.push(entry)
    }
  }
  return { scheduled, unscheduled }
}

// ── Navigation helpers ──
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function formatWeekLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T12:00:00')
  const end = new Date(endDate + 'T12:00:00')

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const year = end.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`
}

export function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function isToday(dateStr: string): boolean {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  return dateStr === todayStr
}

export function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr + 'T12:00:00')
  const day = date.getDay()
  return day === 0 || day === 6
}

/** Returns px offset to scroll to — earliest entry or DEFAULT_SCROLL_HOUR */
export function getSmartScrollTarget(
  entries: EntryWithProject[],
  hourHeight: number,
): number {
  let earliestHour = DEFAULT_SCROLL_HOUR

  for (const entry of entries) {
    if (entry.startTime) {
      const minutes = timeToMinutes(entry.startTime)
      const hour = minutes / 60
      if (hour < earliestHour) {
        earliestHour = hour
      }
    }
  }

  return earliestHour * hourHeight
}
