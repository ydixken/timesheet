import { type CSSProperties } from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  className?: string
  trackClassName?: string
}

export function ProgressBar({
  value,
  max = 100,
  color,
  className = '',
  trackClassName = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const fillStyle: CSSProperties = { width: `${pct}%` }
  if (color) fillStyle.backgroundColor = color
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-terminal-inset ${trackClassName} ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${color ? '' : 'bg-terminal-green'}`}
        style={fillStyle}
      />
    </div>
  )
}
