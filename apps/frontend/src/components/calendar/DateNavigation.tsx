import { Button } from '../ui/Button'

interface DateNavigationProps {
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  label: string
}

export function DateNavigation({ onPrev, onNext, onToday, label }: DateNavigationProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={onPrev} className="px-2 py-1 text-xs">
        &#9664;
      </Button>
      <span className="text-terminal-text-bright font-mono text-sm min-w-[12rem] text-center">
        {label}
      </span>
      <Button variant="outline" onClick={onNext} className="px-2 py-1 text-xs">
        &#9654;
      </Button>
      <Button variant="outline" onClick={onToday} className="px-2 py-1 text-xs ml-2">
        today
      </Button>
    </div>
  )
}
