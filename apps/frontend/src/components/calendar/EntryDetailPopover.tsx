import { useEffect, useRef } from 'react'
import type { EntryWithProject } from '../../types'
import { formatDuration, formatTimeRange } from '../../lib/time'

interface EntryDetailPopoverProps {
  entry: EntryWithProject | null
  anchorRect: DOMRect | null
  onClose: () => void
}

export function EntryDetailPopover({ entry, anchorRect, onClose }: EntryDetailPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!entry) return

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [entry, onClose])

  if (!entry || !anchorRect) return null

  // Position: prefer below the anchor, flip to above if not enough space
  const spaceBelow = window.innerHeight - anchorRect.bottom
  const positionBelow = spaceBelow > 200

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${Math.min(anchorRect.left, window.innerWidth - 300)}px`,
    zIndex: 50,
    ...(positionBelow
      ? { top: `${anchorRect.bottom + 4}px` }
      : { bottom: `${window.innerHeight - anchorRect.top + 4}px` }),
  }

  const color = entry.project?.color ?? '#888'

  return (
    <div
      ref={ref}
      className="bg-terminal-bg-light border border-terminal-border rounded-lg shadow-2xl p-4 max-w-xs animate-cmd-content font-mono"
      style={style}
    >
      {/* Project badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm text-terminal-text-bright font-medium">
          {entry.project?.name ?? 'No project'}
        </span>
        {entry.client && (
          <span className="text-xs text-terminal-text">({entry.client.name})</span>
        )}
      </div>

      {/* Description */}
      {entry.description && (
        <p className="text-sm text-terminal-text mb-3 leading-relaxed">
          {entry.description}
        </p>
      )}

      {/* Details */}
      <div className="space-y-1.5 text-xs text-terminal-text">
        {(entry.startTime || entry.endTime) && (
          <div className="flex justify-between">
            <span className="text-terminal-text/60">time</span>
            <span className="text-terminal-text-bright">
              {formatTimeRange(entry.startTime, entry.endTime)}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-terminal-text/60">duration</span>
          <span className="text-terminal-text-bright">{formatDuration(entry.durationMin)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-terminal-text/60">date</span>
          <span className="text-terminal-text-bright">{entry.date}</span>
        </div>
        {entry.billable && (
          <div className="flex justify-between">
            <span className="text-terminal-text/60">billable</span>
            <span className="text-terminal-green text-[10px]">●</span>
          </div>
        )}
      </div>
    </div>
  )
}
