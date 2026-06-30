import { type ElementType, type HTMLAttributes, type KeyboardEvent } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  glow?: boolean
  interactive?: boolean
  accent?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  as?: ElementType
}

const paddings: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({
  elevated = false,
  glow = false,
  interactive = false,
  accent = false,
  padding = 'md',
  as: Component = 'div',
  className = '',
  role,
  tabIndex,
  onKeyDown,
  ...props
}: CardProps) {
  const base = 'border border-terminal-border rounded-lg'
  const classes = [
    base,
    elevated ? 'bg-terminal-elevated shadow-elevated' : 'bg-terminal-bg-light',
    glow && 'shadow-glow',
    accent && 'border-l-2 border-l-terminal-green',
    interactive &&
      'cursor-pointer transition-colors duration-150 hover:border-terminal-green',
    paddings[padding],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      e.currentTarget.click()
    }
    onKeyDown?.(e)
  }

  return (
    <Component
      role={interactive ? (role ?? 'button') : role}
      tabIndex={interactive ? (tabIndex ?? 0) : tabIndex}
      onKeyDown={interactive || onKeyDown ? handleKeyDown : undefined}
      className={classes}
      {...props}
    />
  )
}

export function CardHeader({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center justify-between border-b border-terminal-border px-4 py-3 ${className}`}
      {...props}
    />
  )
}

export function CardTitle({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`text-label-caps text-terminal-text-muted text-xs tracking-[0.08em] ${className}`}
      {...props}
    />
  )
}

export function CardBody({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 ${className}`} {...props} />
}

export function CardFooter({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border-t border-terminal-border px-4 py-3 ${className}`}
      {...props}
    />
  )
}
