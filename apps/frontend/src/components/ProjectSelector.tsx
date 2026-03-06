import type { Project } from '@timesheet/shared'

interface ProjectSelectorProps {
  value: string
  onChange: (projectId: string) => void
  projects: Project[]
  className?: string
}

export function ProjectSelector({ value, onChange, projects, className = '' }: ProjectSelectorProps) {
  const selected = value ? projects.find((p) => p.id === value) : null

  return (
    <div className={`relative ${className}`}>
      {selected && (
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
          style={{ backgroundColor: selected.color }}
        />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30 appearance-none cursor-pointer ${selected ? 'pl-6' : ''}`}
      >
        <option value="">Select project...</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  )
}
