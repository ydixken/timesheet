import type { EntryWithProject } from '../../types'
import { formatDuration } from '../../lib/time'

interface UnscheduledRowProps {
  dates: string[]
  entriesByDate: Map<string, EntryWithProject[]>
}

export function UnscheduledRow({ dates, entriesByDate }: UnscheduledRowProps) {
  // Check if there are any unscheduled entries at all
  const hasAny = dates.some((d) => (entriesByDate.get(d) || []).length > 0)
  if (!hasAny) return null

  return (
    <div
      className="grid border-b border-terminal-border/30 py-1.5"
      style={{ gridTemplateColumns: `56px repeat(${dates.length}, 1fr)` }}
    >
      <div className="text-[9px] text-terminal-text/30 font-mono flex items-center justify-end pr-2">
        unsched
      </div>
      {dates.map((dateStr) => {
        const entries = entriesByDate.get(dateStr) || []
        return (
          <div key={dateStr} className="flex flex-wrap gap-1 px-1 min-h-[24px] items-center">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="inline-flex items-center gap-1 bg-terminal-surface/50 rounded px-1.5 py-0.5 text-[10px] font-mono max-w-full"
              >
                <div
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ backgroundColor: entry.project?.color ?? '#888' }}
                />
                <span className="text-terminal-text truncate max-w-[60px]">
                  {entry.description || entry.project?.name || '—'}
                </span>
                <span className="text-terminal-text/60 shrink-0">
                  {formatDuration(entry.durationMin)}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
