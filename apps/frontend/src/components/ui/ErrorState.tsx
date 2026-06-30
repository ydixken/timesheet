import { Button } from './Button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-3 py-16 ${className}`}
    >
      <span className="font-mono text-sm text-terminal-danger">! error</span>
      <p className="font-prose text-sm text-terminal-text-muted max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          [retry]
        </Button>
      )}
    </div>
  )
}
