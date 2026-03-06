import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm text-terminal-text-bright font-mono">{label}</label>
      )}
      <input
        className={`bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30 placeholder:text-terminal-text/50 ${error ? 'border-terminal-danger' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-terminal-danger">{error}</span>}
    </div>
  )
}
