import { ViewToggle, type CalendarView } from './ViewToggle'
import { DateNavigation } from './DateNavigation'

interface CalendarToolbarProps {
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  dateLabel: string
  /** Hide the week toggle option (phones render day instead of the 7-col week grid). */
  hideWeek?: boolean
}

export function CalendarToolbar({ view, onViewChange, onPrev, onNext, onToday, dateLabel, hideWeek }: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
      <ViewToggle view={view} onChange={onViewChange} hideWeek={hideWeek} />
      <DateNavigation onPrev={onPrev} onNext={onNext} onToday={onToday} label={dateLabel} />
    </div>
  )
}
