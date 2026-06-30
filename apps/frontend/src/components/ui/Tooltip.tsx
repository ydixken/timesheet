import {
  type ReactNode,
  type ReactElement,
  cloneElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

type Side = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  side?: Side
  children: ReactElement
}

const GAP = 6

export function Tooltip({ content, side = 'top', children }: TooltipProps) {
  const id = useId()
  const triggerRef = useRef<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  // Position after mount so we can measure the tooltip and flip when the preferred side overflows
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const { width: tw, height: th } = tooltipRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let resolved = side
    if (side === 'top' && triggerRect.top - th - GAP < 0) resolved = 'bottom'
    else if (side === 'bottom' && triggerRect.bottom + th + GAP > vh) resolved = 'top'
    else if (side === 'left' && triggerRect.left - tw - GAP < 0) resolved = 'right'
    else if (side === 'right' && triggerRect.right + tw + GAP > vw) resolved = 'left'

    let top = 0
    let left = 0
    switch (resolved) {
      case 'top':
        top = triggerRect.top - th - GAP
        left = triggerRect.left + triggerRect.width / 2 - tw / 2
        break
      case 'bottom':
        top = triggerRect.bottom + GAP
        left = triggerRect.left + triggerRect.width / 2 - tw / 2
        break
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - th / 2
        left = triggerRect.left - tw - GAP
        break
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - th / 2
        left = triggerRect.right + GAP
        break
    }

    // Clamp into the viewport so the panel never spills off-screen
    setCoords({
      top: Math.max(GAP, Math.min(top, vh - th - GAP)),
      left: Math.max(GAP, Math.min(left, vw - tw - GAP)),
    })
  }, [open, side, content])

  const show = (node: HTMLElement) => {
    triggerRef.current = node
    setOpen(true)
  }
  const hide = () => setOpen(false)

  const child = cloneElement(children, {
    'aria-describedby': open ? id : undefined,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(e)
      show(e.currentTarget)
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseLeave?.(e)
      hide()
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      children.props.onFocus?.(e)
      show(e.currentTarget)
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      children.props.onBlur?.(e)
      hide()
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      children.props.onKeyDown?.(e)
      if (e.key === 'Escape') hide()
    },
  })

  return (
    <>
      {child}
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            id={id}
            role="tooltip"
            className="fixed z-50 bg-terminal-elevated border border-terminal-border rounded-md shadow-overlay px-2 py-1 text-xs font-prose text-terminal-text-bright max-w-xs pointer-events-none"
            style={{ top: coords.top, left: coords.left }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}
