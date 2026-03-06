interface ProjectBadgeProps {
  name: string
  color: string
  clientName?: string | null
}

export function ProjectBadge({ name, color, clientName }: ProjectBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-sm font-mono text-terminal-text-bright">{name}</span>
      {clientName && <span className="text-xs text-terminal-text">({clientName})</span>}
    </div>
  )
}
