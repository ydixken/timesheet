interface Segment {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: Segment[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps) {
  const base =
    'px-3 py-1.5 rounded-md border text-sm font-mono transition-colors duration-150 cursor-pointer'
  const active = 'border-terminal-green text-terminal-green bg-terminal-green/10'
  const inactive =
    'border-terminal-border text-terminal-text-muted hover:text-terminal-text-bright hover:border-terminal-border-strong'
  return (
    <div className={`inline-flex gap-1 ${className}`}>
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            className={`${base} ${isActive ? active : inactive}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
