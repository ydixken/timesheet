import { type HTMLAttributes } from 'react'

type BadgeVariant = 'default' | 'success' | 'info' | 'warning' | 'danger' | 'muted'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const base =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-mono'
  const variants = {
    default: 'border-terminal-border text-terminal-text-bright',
    success: 'border-terminal-green/40 text-terminal-green bg-terminal-green/5',
    info: 'border-terminal-blue/40 text-terminal-blue bg-terminal-blue/5',
    warning: 'border-terminal-warning/40 text-terminal-warning bg-terminal-warning/5',
    danger: 'border-terminal-danger/40 text-terminal-danger bg-terminal-danger/5',
    muted: 'border-terminal-border text-terminal-text-muted',
  }
  return (
    <span className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  )
}
