import { useState, useEffect, useMemo, useCallback } from 'react'
import { useEntries } from '../hooks/useEntries'
import { useProjects } from '../hooks/useProjects'
import { getWeekDates, groupEntriesByDate } from '../lib/time'
import { addDays, formatWeekLabel, formatDayLabel } from '../lib/calendar-utils'
import { CalendarToolbar } from '../components/calendar/CalendarToolbar'
import { WeekView } from '../components/calendar/WeekView'
import { DayView } from '../components/calendar/DayView'
import { MonthView } from '../components/calendar/MonthView'
import { EntryDetailPopover } from '../components/calendar/EntryDetailPopover'
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

export function Calendar() {
  const [view, setView] = useState<CalendarView>('week')
  const [refDate, setRefDate] = useState(new Date())

  const { entries, loading, fetch: fetchEntries, create } = useEntries()
  const { projects, fetch: fetchProjects } = useProjects()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Compute date range based on view + refDate
  const dateRange = useMemo(() => {
    if (view === 'week') return getWeekDates(refDate)
    if (view === 'day') {
      const d = refDate.toISOString().split('T')[0]
      return { start: d, end: d, dates: [d] }
    }
    // month — getMonthRange returns start/end, no dates array needed
    const mr = getMonthRange(refDate.getFullYear(), refDate.getMonth())
    return { start: mr.start, end: mr.end, dates: [] }
  }, [view, refDate])

  // Fetch entries when range changes
  useEffect(() => {
    fetchEntries({ start: dateRange.start, end: dateRange.end })
  }, [fetchEntries, dateRange.start, dateRange.end])

  // Navigation
  const navigatePrev = useCallback(() => {
    setRefDate((d) => {
      if (view === 'week') return addDays(d, -7)
      if (view === 'day') return addDays(d, -1)
      // month
      const next = new Date(d)
      next.setMonth(next.getMonth() - 1)
      return next
    })
  }, [view])

  const navigateNext = useCallback(() => {
    setRefDate((d) => {
      if (view === 'week') return addDays(d, 7)
      if (view === 'day') return addDays(d, 1)
      // month
      const next = new Date(d)
      next.setMonth(next.getMonth() + 1)
      return next
    })
  }, [view])

  const navigateToday = useCallback(() => setRefDate(new Date()), [])

  // Date label
  const dateLabel = useMemo(() => {
    if (view === 'week') return formatWeekLabel(dateRange.start, dateRange.end)
    if (view === 'day') return formatDayLabel(dateRange.start)
    return refDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [view, dateRange, refDate])

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
    <div>
      <h1 className="page-heading text-2xl font-bold text-terminal-text-bright mb-6 font-mono">
        calendar
      </h1>

      <CalendarToolbar
        view={view}
        onViewChange={setView}
        onPrev={navigatePrev}
        onNext={navigateNext}
        onToday={navigateToday}
        dateLabel={dateLabel}
      />

      {loading && entries.length === 0 ? (
        <p className="text-terminal-text font-mono text-sm">Loading...</p>
      ) : (
        <>
          {view === 'week' && (
            <WeekView
              dates={dateRange.dates}
              entriesByDate={entriesByDate}
              onEntryClick={handleEntryClick}
            />
          )}
          {view === 'day' && (
            <DayView
              dateStr={dateRange.start}
              entries={entriesByDate.get(dateRange.start) || []}
              onEntryClick={handleEntryClick}
            />
          )}
          {view === 'month' && (
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
      />
    </div>
  )
}
