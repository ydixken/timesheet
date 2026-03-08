export type CalendarView = 'week' | 'day' | 'month'

interface ViewToggleProps {
  view: CalendarView
  onChange: (view: CalendarView) => void
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const views: CalendarView[] = ['week', 'day', 'month']

  return (
    <div className="inline-flex gap-1">
      {views.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`font-mono text-xs px-3 py-1.5 border rounded transition-colors cursor-pointer ${
            view === v
              ? 'bg-terminal-green/10 text-terminal-green border-terminal-green'
              : 'text-terminal-text border-terminal-border hover:border-terminal-green/50 hover:text-terminal-text-bright'
          }`}
        >
          [{v}]
        </button>
      ))}
    </div>
  )
}
