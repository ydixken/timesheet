import { type ReactNode } from 'react'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: ReactNode
  tone?: 'bright' | 'green' | 'danger' | 'blue' | 'muted' | 'warning'
  sub?: ReactNode
  trend?: { value: string; direction: 'up' | 'down' | 'flat' }
  accentColor?: string
  className?: string
}

const tones = {
  bright: 'text-terminal-text-bright',
  green: 'text-terminal-green',
  danger: 'text-terminal-danger',
  blue: 'text-terminal-blue',
  muted: 'text-terminal-text-muted',
  warning: 'text-terminal-warning',
} as const

const trends = {
  up: { arrow: '▲', className: 'text-terminal-green' },
  down: { arrow: '▼', className: 'text-terminal-danger' },
  flat: { arrow: '→', className: 'text-terminal-text-muted' },
} as const

export function StatCard({
  label,
  value,
  tone = 'bright',
  sub,
  trend,
  accentColor,
  className,
}: StatCardProps) {
  const cardClassName = [accentColor && 'border-l-2', className].filter(Boolean).join(' ')

  return (
    <Card
      elevated
      className={cardClassName}
      style={accentColor ? { borderLeftColor: accentColor } : undefined}
    >
      <p className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]">{label}</p>
      <p className={`font-data text-metric mt-1 truncate ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-terminal-text-muted mt-1">{sub}</p>}
      {trend && (
        <p
          className={`font-data text-xs mt-1 flex items-center gap-1 ${trends[trend.direction].className}`}
        >
          <span aria-hidden="true">{trends[trend.direction].arrow}</span>
          <span>{trend.value}</span>
        </p>
      )}
    </Card>
  )
}
