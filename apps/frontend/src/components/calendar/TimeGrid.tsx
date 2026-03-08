import { useRef, useEffect, useMemo } from 'react'
import type { EntryWithProject } from '../../types'
import { getSmartScrollTarget } from '../../lib/calendar-utils'
import { HourLabels } from './HourLabels'
import { DayColumn } from './DayColumn'

interface TimeGridProps {
  dates: string[]
  scheduledByDate: Map<string, EntryWithProject[]>
  hourHeight: number
  onEntryClick: (entry: EntryWithProject, rect: DOMRect) => void
}

export function TimeGrid({ dates, scheduledByDate, hourHeight, onEntryClick }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Gather all entries for smart scroll
  const allEntries = useMemo(() => {
    const all: EntryWithProject[] = []
    for (const entries of scheduledByDate.values()) {
      all.push(...entries)
    }
    return all
  }, [scheduledByDate])

  useEffect(() => {
    if (scrollRef.current) {
      const target = getSmartScrollTarget(allEntries, hourHeight)
      scrollRef.current.scrollTop = Math.max(0, target - 20) // 20px padding above
    }
  }, [allEntries, hourHeight, dates]) // re-scroll on navigation (dates change)

  return (
    <div
      ref={scrollRef}
      className="relative overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 220px)' }}
    >
      <div
        className="grid relative"
        style={{ gridTemplateColumns: `56px repeat(${dates.length}, 1fr)` }}
      >
        {/* Hour labels column */}
        <HourLabels hourHeight={hourHeight} />

        {/* Day columns */}
        {dates.map((dateStr) => {
          const entries = scheduledByDate.get(dateStr) || []
          const todayStr = new Date().toISOString().split('T')[0]
          const date = new Date(dateStr + 'T12:00:00')
          const dayOfWeek = date.getDay()
          const weekend = dayOfWeek === 0 || dayOfWeek === 6

          return (
            <DayColumn
              key={dateStr}
              dateStr={dateStr}
              entries={entries}
              hourHeight={hourHeight}
              isToday={dateStr === todayStr}
              isWeekend={weekend}
              onEntryClick={onEntryClick}
            />
          )
        })}

        {/* Hour grid lines - rendered as overlay */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: '56px',
            right: 0,
            top: 0,
            height: `${hourHeight * 24}px`,
          }}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <div key={`hour-${i}`}>
              <div
                className="absolute left-0 right-0 border-b border-terminal-border/15"
                style={{ top: `${i * hourHeight}px` }}
              />
              <div
                className="absolute left-0 right-0 border-b border-dashed border-terminal-border/8"
                style={{ top: `${i * hourHeight + hourHeight / 2}px` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
