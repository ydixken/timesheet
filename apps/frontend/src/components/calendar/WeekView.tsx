import { useMemo } from 'react'
import type { EntryWithProject } from '../../types'
import { splitScheduledUnscheduled, HOUR_HEIGHT_DEFAULT, isToday, isWeekend } from '../../lib/calendar-utils'
import { TimeGrid } from './TimeGrid'
import { DayColumnHeader } from './DayColumnHeader'
import { UnscheduledRow } from './UnscheduledRow'

interface WeekViewProps {
  dates: string[]
  entriesByDate: Map<string, EntryWithProject[]>
  onEntryClick: (entry: EntryWithProject, rect: DOMRect) => void
}

export function WeekView({ dates, entriesByDate, onEntryClick }: WeekViewProps) {
  const { scheduledByDate, unscheduledByDate, totalMinutesByDate } = useMemo(() => {
    const scheduled = new Map<string, EntryWithProject[]>()
    const unscheduled = new Map<string, EntryWithProject[]>()
    const totals = new Map<string, number>()

    for (const dateStr of dates) {
      const dayEntries = entriesByDate.get(dateStr) || []
      const split = splitScheduledUnscheduled(dayEntries)
      scheduled.set(dateStr, split.scheduled)
      unscheduled.set(dateStr, split.unscheduled)
      totals.set(dateStr, dayEntries.reduce((sum, e) => sum + e.durationMin, 0))
    }

    return { scheduledByDate: scheduled, unscheduledByDate: unscheduled, totalMinutesByDate: totals }
  }, [dates, entriesByDate])

  return (
    <div>
      {/* Day column headers */}
      <div className="grid" style={{ gridTemplateColumns: `56px repeat(${dates.length}, 1fr)` }}>
        <div /> {/* gutter spacer */}
        {dates.map((dateStr) => (
          <DayColumnHeader
            key={dateStr}
            dateStr={dateStr}
            totalMinutes={totalMinutesByDate.get(dateStr) || 0}
            isToday={isToday(dateStr)}
            isWeekend={isWeekend(dateStr)}
          />
        ))}
      </div>

      {/* Unscheduled row */}
      <UnscheduledRow dates={dates} entriesByDate={unscheduledByDate} />

      {/* Time grid */}
      <TimeGrid
        dates={dates}
        scheduledByDate={scheduledByDate}
        hourHeight={HOUR_HEIGHT_DEFAULT}
        onEntryClick={onEntryClick}
      />
    </div>
  )
}
