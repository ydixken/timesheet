import { useState, useEffect, useMemo, useCallback } from 'react'
import { useEntries } from '../hooks/useEntries'
import { useProjects } from '../hooks/useProjects'
import { formatLocalDate, getWeekDates, groupEntriesByDate } from '../lib/time'
import { addDays, formatWeekLabel, formatDayLabel } from '../lib/calendar-utils'
import { CalendarToolbar } from '../components/calendar/CalendarToolbar'
import { WeekView } from '../components/calendar/WeekView'
import { DayView } from '../components/calendar/DayView'
import { MonthView } from '../components/calendar/MonthView'
import { EntryDetailPopover } from '../components/calendar/EntryDetailPopover'
import { Skeleton } from '../components/ui/Skeleton'
import type { CalendarView } from '../components/calendar/ViewToggle'
import type { EntryWithProject } from '../types'

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(year, month + 1, 0).getDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    start: `${year}-${pad(month + 1)}-01`,
    end: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  }
}

/** Shape-matched loading placeholder for the week/day time grid. */
function CalendarSkeleton({ columns }: { columns: number }) {
  return (
    <div aria-hidden className="animate-fade-in">
      <div className="grid mb-2" style={{ gridTemplateColumns: `56px repeat(${columns}, 1fr)` }}>
        <div />
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 px-1 py-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
      <Skeleton className="h-[60vh] w-full rounded-lg" />
    </div>
  )
}

export function Calendar() {
  const [view, setView] = useState<CalendarView>('week')
  const [refDate, setRefDate] = useState(new Date())

  // Below md (768px) the 7-column week grid collapses to ~45px columns and is
  // unusable on phones, so we coerce week -> day and hide the week toggle option.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const effectiveView: CalendarView = isMobile && view === 'week' ? 'day' : view

  const { entries, loading, fetch: fetchEntries, create } = useEntries()
  const { projects, fetch: fetchProjects } = useProjects()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Compute date range based on view + refDate
  const dateRange = useMemo(() => {
    if (effectiveView === 'week') return getWeekDates(refDate)
    if (effectiveView === 'day') {
      const d = formatLocalDate(refDate)
      return { start: d, end: d, dates: [d] }
    }
    // month — getMonthRange returns start/end, no dates array needed
    const mr = getMonthRange(refDate.getFullYear(), refDate.getMonth())
    return { start: mr.start, end: mr.end, dates: [] }
  }, [effectiveView, refDate])

  // Fetch entries when range changes
  useEffect(() => {
    fetchEntries({ start: dateRange.start, end: dateRange.end })
  }, [fetchEntries, dateRange.start, dateRange.end])

  // Navigation
  const navigatePrev = useCallback(() => {
    setRefDate((d) => {
      if (effectiveView === 'week') return addDays(d, -7)
      if (effectiveView === 'day') return addDays(d, -1)
      // month
      const next = new Date(d)
      next.setMonth(next.getMonth() - 1)
      return next
    })
  }, [effectiveView])

  const navigateNext = useCallback(() => {
    setRefDate((d) => {
      if (effectiveView === 'week') return addDays(d, 7)
      if (effectiveView === 'day') return addDays(d, 1)
      // month
      const next = new Date(d)
      next.setMonth(next.getMonth() + 1)
      return next
    })
  }, [effectiveView])

  const navigateToday = useCallback(() => setRefDate(new Date()), [])

  // Date label
  const dateLabel = useMemo(() => {
    if (effectiveView === 'week') return formatWeekLabel(dateRange.start, dateRange.end)
    if (effectiveView === 'day') return formatDayLabel(dateRange.start)
    return refDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [effectiveView, dateRange, refDate])

  // Entry detail popover state
  const [selectedEntry, setSelectedEntry] = useState<EntryWithProject | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const handleEntryClick = useCallback((entry: EntryWithProject, rect: DOMRect) => {
    setSelectedEntry(entry)
    setAnchorRect(rect)
  }, [])

  const entriesByDate = useMemo(() => groupEntriesByDate(entries), [entries])

  const handleCreateEntry = useCallback(async (data: any) => {
    await create(data)
    await fetchEntries({ start: dateRange.start, end: dateRange.end })
  }, [create, fetchEntries, dateRange.start, dateRange.end])

  const handleRefreshEntries = useCallback(async () => {
    await fetchEntries({ start: dateRange.start, end: dateRange.end })
  }, [fetchEntries, dateRange.start, dateRange.end])

  return (
    <div className="animate-fade-in">
      <h1 className="page-heading text-2xl font-bold text-terminal-text-bright mb-6 font-mono">
        calendar
      </h1>

      <CalendarToolbar
        view={effectiveView}
        onViewChange={setView}
        onPrev={navigatePrev}
        onNext={navigateNext}
        onToday={navigateToday}
        dateLabel={dateLabel}
        hideWeek={isMobile}
      />

      {loading && entries.length === 0 ? (
        <CalendarSkeleton columns={effectiveView === 'day' ? 1 : 7} />
      ) : (
        <>
          {/* Subtle empty note — the grid below still renders so the period stays scannable */}
          {entries.length === 0 && effectiveView !== 'month' && (
            <p className="mb-3 text-center font-mono text-xs text-terminal-text-muted">
              <span className="text-terminal-green">$ </span>
              no entries this {effectiveView}
            </p>
          )}

          {effectiveView === 'week' && (
            <WeekView
              dates={dateRange.dates}
              entriesByDate={entriesByDate}
              onEntryClick={handleEntryClick}
            />
          )}
          {effectiveView === 'day' && (
            <DayView
              dateStr={dateRange.start}
              entries={entriesByDate.get(dateRange.start) || []}
              onEntryClick={handleEntryClick}
            />
          )}
          {effectiveView === 'month' && (
            <MonthView
              currentYear={refDate.getFullYear()}
              currentMonth={refDate.getMonth()}
              entries={entries}
              loading={loading}
              projects={projects}
              onCreateEntry={handleCreateEntry}
              onRefreshEntries={handleRefreshEntries}
            />
          )}
        </>
      )}

      <EntryDetailPopover
        entry={selectedEntry}
        anchorRect={anchorRect}
        onClose={() => setSelectedEntry(null)}
        isMobile={isMobile}
      />
    </div>
  )
}
