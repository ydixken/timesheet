import type { EntryWithProject } from '../../types'
import { computeOverlapLayout } from '../../lib/calendar-utils'
import { EntryBlock } from './EntryBlock'
import { CurrentTimeIndicator } from './CurrentTimeIndicator'

interface DayColumnProps {
  dateStr: string
  entries: EntryWithProject[]
  hourHeight: number
  isToday: boolean
  isWeekend: boolean
  onEntryClick: (entry: EntryWithProject, rect: DOMRect) => void
}

export function DayColumn({ dateStr, entries, hourHeight, isToday, isWeekend, onEntryClick }: DayColumnProps) {
  const positioned = computeOverlapLayout(entries, hourHeight)

  return (
    <div
      className={`relative border-r border-terminal-border/30 ${isToday ? 'bg-terminal-green/[0.02]' : ''} ${isWeekend ? 'opacity-70' : ''}`}
      style={{ height: `${hourHeight * 24}px` }}
    >
      {positioned.map((p) => (
        <EntryBlock
          key={p.entry.id}
          entry={p.entry}
          top={p.top}
          height={p.height}
          column={p.column}
          totalColumns={p.totalColumns}
          onClick={onEntryClick}
        />
      ))}
      {isToday && <CurrentTimeIndicator hourHeight={hourHeight} />}
    </div>
  )
}
