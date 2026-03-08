import { formatDuration } from '../../lib/time'

interface DayColumnHeaderProps {
  dateStr: string
  totalMinutes: number
  isToday: boolean
  isWeekend: boolean
}

export function DayColumnHeader({ dateStr, totalMinutes, isToday, isWeekend }: DayColumnHeaderProps) {
  const date = new Date(dateStr + 'T12:00:00')
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dayMonth = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className={`py-2 px-1 text-center border-b border-terminal-border/50 ${isWeekend ? 'opacity-60' : ''}`}>
      <div className={`text-[11px] font-mono uppercase ${isToday ? 'text-terminal-green font-bold' : 'text-terminal-text'}`}>
        {dayName}
      </div>
      <div className={`text-[11px] font-mono ${isToday ? 'text-terminal-green font-bold' : 'text-terminal-text-bright'}`}>
        {dayMonth}
      </div>
      {totalMinutes > 0 && (
        <div className="text-terminal-text/60 text-[10px] font-mono mt-0.5">
          {formatDuration(totalMinutes)}
        </div>
      )}
    </div>
  )
}
