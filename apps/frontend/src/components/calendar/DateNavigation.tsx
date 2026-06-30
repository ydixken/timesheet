import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

interface DateNavigationProps {
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  label: string
}

export function DateNavigation({ onPrev, onNext, onToday, label }: DateNavigationProps) {
  return (
    <div className="flex items-center justify-between gap-2 sm:justify-start">
      <Button
        variant="outline"
        onClick={onPrev}
        aria-label="Previous"
        className="tap-target inline-flex items-center justify-center px-2 py-1"
      >
        <Icon name="chevron-right" className="rotate-180" />
      </Button>
      <span className="flex-1 text-center text-terminal-text-bright font-mono text-sm sm:flex-none sm:min-w-[12rem]">
        {label}
      </span>
      <Button
        variant="outline"
        onClick={onNext}
        aria-label="Next"
        className="tap-target inline-flex items-center justify-center px-2 py-1"
      >
        <Icon name="chevron-right" />
      </Button>
      <Button
        variant="outline"
        onClick={onToday}
        className="tap-target px-3 py-1 text-xs sm:ml-2"
      >
        today
      </Button>
    </div>
  )
}
