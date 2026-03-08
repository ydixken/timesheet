import { ViewToggle, type CalendarView } from './ViewToggle'
import { DateNavigation } from './DateNavigation'

interface CalendarToolbarProps {
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  dateLabel: string
}

export function CalendarToolbar({ view, onViewChange, onPrev, onNext, onToday, dateLabel }: CalendarToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <ViewToggle view={view} onChange={onViewChange} />
      <DateNavigation onPrev={onPrev} onNext={onNext} onToday={onToday} label={dateLabel} />
    </div>
  )
}
