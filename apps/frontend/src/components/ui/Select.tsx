import { type SelectHTMLAttributes, type ReactNode } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  options?: SelectOption[]
  children?: ReactNode
}

export function Select({ label, error, options, children, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm text-terminal-text-bright font-mono">{label}</label>
      )}
      <div className="relative">
        <select
          className={`bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30 placeholder:text-terminal-text-muted appearance-none cursor-pointer pr-8 ${error ? 'border-terminal-danger' : ''} ${className}`}
          {...props}
        >
          {options
            ? options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-terminal-text-muted"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
      {error && <span className="text-xs text-terminal-danger">{error}</span>}
    </div>
  )
}
