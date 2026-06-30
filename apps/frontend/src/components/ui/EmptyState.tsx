import { Button } from './Button'

interface EmptyStateProps {
  prompt: string // short mono command-style line, e.g. "no entries in range"
  message?: string // a human sentence (Inter)
  action?: { label: string; onClick: () => void }
  variant?: 'default' | 'chart' // 'chart' = compact, no tall min-height
  className?: string
}

export function EmptyState({
  prompt,
  message,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  const pad = variant === 'chart' ? 'py-8' : 'py-16'
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-3 ${pad} ${className}`}
    >
      <span className="font-mono text-sm text-terminal-text-muted">
        <span className="text-terminal-green">$ </span>
        {prompt}
      </span>
      {message && (
        <p className="font-prose text-sm text-terminal-text-muted max-w-sm">{message}</p>
      )}
      {action && (
        <Button variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
