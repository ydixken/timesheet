import { useBudgetAlerts } from '../hooks/useBudgetAlerts'

export function BudgetToast() {
  const toast = useBudgetAlerts((s) => s.toast)
  const dismissToast = useBudgetAlerts((s) => s.dismissToast)

  if (!toast) return null

  const borderColor =
    toast.level === 'warning' ? 'border-terminal-warning' : 'border-terminal-danger'
  const textColor =
    toast.level === 'warning' ? 'text-terminal-warning' : 'text-terminal-danger'

  return (
    <div className="fixed bottom-20 right-6 z-50 max-w-sm animate-cmd-content">
      <div className={`bg-terminal-bg-light border ${borderColor} rounded-lg px-4 py-3`}>
        <div className="flex items-start gap-3">
          <span className={`${textColor} font-mono font-bold text-sm shrink-0`}>!!</span>
          <div className="flex-1 min-w-0">
            <p className="text-terminal-text-bright font-mono text-xs font-bold mb-0.5">
              budget alert
            </p>
            <p className={`${textColor} font-mono text-sm`}>
              {toast.projectName} at {toast.percentage}% of budget
            </p>
          </div>
          <button
            onClick={dismissToast}
            className="text-terminal-text/40 hover:text-terminal-text font-mono text-xs shrink-0 cursor-pointer"
          >
            x
          </button>
        </div>
      </div>
    </div>
  )
}
