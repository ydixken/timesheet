import { type HTMLAttributes } from 'react'

type SkeletonProps = HTMLAttributes<HTMLDivElement>

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden
      className={`bg-terminal-skeleton rounded animate-shimmer ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
        backgroundSize: '200% 100%',
      }}
    />
  )
}

interface SkeletonTextProps {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div
      role="status"
      className="bg-terminal-bg-light border border-terminal-border rounded-lg p-4"
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-32 mt-2" />
      <span className="sr-only">Loading</span>
    </div>
  )
}
