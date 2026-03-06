import { type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'outline' | 'filled' | 'danger'
}

export function Button({ variant = 'outline', className = '', children, ...props }: ButtonProps) {
  const base =
    'px-4 py-2 rounded font-mono text-sm font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    outline:
      'border border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg',
    filled: 'bg-terminal-green text-terminal-bg hover:bg-terminal-green-hover',
    danger:
      'border border-terminal-danger text-terminal-danger hover:bg-terminal-danger hover:text-terminal-bg',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
