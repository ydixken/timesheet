import { useMemo } from 'react'
import type { EntryWithProject } from '../../types'
import { splitScheduledUnscheduled, HOUR_HEIGHT_DEFAULT, isToday, isWeekend } from '../../lib/calendar-utils'
import { TimeGrid } from './TimeGrid'
import { DayColumnHeader } from './DayColumnHeader'
import { UnscheduledRow } from './UnscheduledRow'

interface DayViewProps {
  dateStr: string
  entries: EntryWithProject[]
  onEntryClick: (entry: EntryWithProject, rect: DOMRect) => void
}

export function DayView({ dateStr, entries, onEntryClick }: DayViewProps) {
  const dates = useMemo(() => [dateStr], [dateStr])

  const { scheduledByDate, unscheduledByDate, totalMinutes } = useMemo(() => {
    const split = splitScheduledUnscheduled(entries)
    const scheduled = new Map<string, EntryWithProject[]>()
    const unscheduled = new Map<string, EntryWithProject[]>()
    scheduled.set(dateStr, split.scheduled)
    unscheduled.set(dateStr, split.unscheduled)
    const total = entries.reduce((sum, e) => sum + e.durationMin, 0)
    return { scheduledByDate: scheduled, unscheduledByDate: unscheduled, totalMinutes: total }
  }, [dateStr, entries])

  return (
    <div>
      {/* Day header */}
      <div className="grid" style={{ gridTemplateColumns: '56px 1fr' }}>
        <div />
        <DayColumnHeader
          dateStr={dateStr}
          totalMinutes={totalMinutes}
          isToday={isToday(dateStr)}
          isWeekend={isWeekend(dateStr)}
        />
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
