import { useRef } from 'react'
import type { EntryWithProject } from '../../types'
import { formatDuration } from '../../lib/time'

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

interface EntryBlockProps {
  entry: EntryWithProject
  top: number
  height: number
  column: number
  totalColumns: number
  onClick: (entry: EntryWithProject, rect: DOMRect) => void
}

export function EntryBlock({ entry, top, height, column, totalColumns, onClick }: EntryBlockProps) {
  const color = entry.project?.color ?? '#888'
  const ref = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    if (ref.current) {
      onClick(entry, ref.current.getBoundingClientRect())
    }
  }

  const left = `${(column / totalColumns) * 100}%`
  const width = `calc(${(1 / totalColumns) * 100}% - 2px)`

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className="absolute overflow-hidden cursor-pointer rounded-r-sm border-l-[3px] px-1.5 py-0.5 font-mono transition-colors duration-150"
      style={{
        top: `${top}px`,
        left,
        width,
        height: `${height}px`,
        backgroundColor: hexToRgba(color, 0.12),
        borderLeftColor: color,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hexToRgba(color, 0.20)
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = hexToRgba(color, 0.12)
      }}
    >
      {height >= 64 ? (
        // Tall layout: description + project + duration
        <div className="flex flex-col h-full">
          <span className="text-[11px] text-terminal-text-bright truncate leading-tight">
            {entry.description || '—'}
          </span>
          <span className="text-[10px] truncate leading-tight mt-0.5" style={{ color }}>
            {entry.project?.name ?? 'No project'}
            {entry.client ? ` · ${entry.client.name}` : ''}
          </span>
          <span className="text-[10px] text-terminal-text/60 mt-auto self-end">
            {formatDuration(entry.durationMin)}
          </span>
        </div>
      ) : height >= 36 ? (
        // Medium layout: project + duration
        <div className="flex flex-col h-full justify-center">
          <span className="text-[10px] truncate leading-tight" style={{ color }}>
            {entry.project?.name ?? 'No project'}
          </span>
          <span className="text-[10px] text-terminal-text/60">
            {formatDuration(entry.durationMin)}
          </span>
        </div>
      ) : (
        // Small layout: duration only
        <div className="flex items-center justify-center h-full">
          <span className="text-[10px] text-terminal-text/60">
            {formatDuration(entry.durationMin)}
          </span>
        </div>
      )}
    </div>
  )
}
