import { useEffect, useRef } from 'react'
import type { EntryWithProject } from '../../types'
import { formatDuration, formatTimeRange } from '../../lib/time'

interface EntryDetailPopoverProps {
  entry: EntryWithProject | null
  anchorRect: DOMRect | null
  onClose: () => void
  /** On phones the popover renders as a bottom sheet instead of an anchored card. */
  isMobile?: boolean
}

export function EntryDetailPopover({ entry, anchorRect, onClose, isMobile = false }: EntryDetailPopoverProps) {
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

  if (!entry) return null
  // Desktop needs an anchor to position against; the mobile sheet does not.
  if (!isMobile && !anchorRect) return null

  // Desktop: prefer below the anchor, flip to above if not enough space.
  let style: React.CSSProperties | undefined
  if (!isMobile && anchorRect) {
    const spaceBelow = window.innerHeight - anchorRect.bottom
    const positionBelow = spaceBelow > 200
    style = {
      position: 'fixed',
      left: `${Math.min(anchorRect.left, window.innerWidth - 300)}px`,
      zIndex: 50,
      ...(positionBelow
        ? { top: `${anchorRect.bottom + 4}px` }
        : { bottom: `${window.innerHeight - anchorRect.top + 4}px` }),
    }
  }

  const color = entry.project?.color ?? '#888'

  const base =
    'border border-terminal-border bg-terminal-elevated shadow-overlay font-mono animate-cmd-content'
  const className = isMobile
    ? `${base} fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] z-50 mx-2 rounded-2xl p-4 max-h-[70vh] overflow-y-auto`
    : `${base} rounded-lg p-4 max-w-xs`

  return (
    <div ref={ref} className={className} style={style}>
      {/* Grab handle (mobile sheet only) */}
      {isMobile && <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-terminal-border" />}

      {/* Project badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm text-terminal-text-bright font-medium">
          {entry.project?.name ?? 'No project'}
        </span>
        {entry.client && (
          <span className="text-xs text-terminal-text-muted">({entry.client.name})</span>
        )}
      </div>

      {/* Description */}
      {entry.description && (
        <p className="font-prose text-sm text-terminal-text mb-3 leading-relaxed">
          {entry.description}
        </p>
      )}

      {/* Details */}
      <div className="space-y-1.5 text-xs text-terminal-text">
        {(entry.startTime || entry.endTime) && (
          <div className="flex justify-between">
            <span className="text-terminal-text-muted">time</span>
            <span className="text-terminal-text-bright font-data">
              {formatTimeRange(entry.startTime, entry.endTime)}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-terminal-text-muted">duration</span>
          <span className="text-terminal-text-bright font-data">{formatDuration(entry.durationMin)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-terminal-text-muted">date</span>
          <span className="text-terminal-text-bright font-data">{entry.date}</span>
        </div>
        {entry.billable && (
          <div className="flex justify-between">
            <span className="text-terminal-text-muted">billable</span>
            <span className="text-terminal-green text-[10px]">●</span>
          </div>
        )}
      </div>
    </div>
  )
}
