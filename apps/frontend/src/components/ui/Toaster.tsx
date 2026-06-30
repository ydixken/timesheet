import { useToasts } from '../../store/toasts'
import type { ToastVariant } from '../../store/toasts'

const accentByVariant: Record<ToastVariant, string> = {
  success: 'border-l-2 border-l-terminal-green',
  warning: 'border-l-2 border-l-terminal-warning',
  danger: 'border-l-2 border-l-terminal-danger',
  info: 'border-l-2 border-l-terminal-blue',
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed right-4 left-4 sm:left-auto bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live={t.variant === 'danger' ? 'assertive' : 'polite'}
          className={`bg-terminal-elevated border border-terminal-border rounded-lg shadow-elevated px-4 py-3 animate-cmd-content flex items-start gap-3 min-w-[260px] max-w-sm ${accentByVariant[t.variant]}`}
        >
          <div className="flex-1 min-w-0">
            {t.title && (
              <p className="font-mono text-terminal-text-bright text-sm mb-0.5">{t.title}</p>
            )}
            <p className="font-prose text-terminal-text-muted text-sm break-words">{t.message}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="text-terminal-text-muted hover:text-terminal-text-bright text-sm shrink-0 cursor-pointer leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
