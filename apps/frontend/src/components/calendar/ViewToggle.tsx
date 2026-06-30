import { SegmentedControl } from '../ui/SegmentedControl'

export type CalendarView = 'week' | 'day' | 'month'

interface ViewToggleProps {
  view: CalendarView
  onChange: (view: CalendarView) => void
  /** Hide the week option (the 7-column week grid is unusable on phones). */
  hideWeek?: boolean
}

export function ViewToggle({ view, onChange, hideWeek = false }: ViewToggleProps) {
  const options = [
    ...(hideWeek ? [] : [{ value: 'week', label: 'Week' }]),
    { value: 'day', label: 'Day' },
    { value: 'month', label: 'Month' },
  ]

  return (
    <SegmentedControl
      options={options}
      value={view}
      onChange={(v) => onChange(v as CalendarView)}
    />
  )
}
