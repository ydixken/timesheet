import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  size?: ModalSize
  footer?: ReactNode
  children: ReactNode
}

const SIZE_MAX_W: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog accessibility: body scroll-lock, initial focus, focus restore, Tab trap, Escape-to-close.
 * Drives any portal-rendered dialog; `panelRef` must point at the focusable dialog container.
 */
export function useDialogA11y(
  open: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusables = (): HTMLElement[] =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (el) => el.offsetParent !== null,
          )
        : []

    const initial = focusables()
    if (initial.length > 0) initial[0].focus()
    else panel?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel) return

      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [open, onClose, panelRef])
}

export function ModalHeader({
  id,
  onClose,
  children,
}: {
  id?: string
  onClose?: () => void
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-terminal-border">
      <h2 id={id} className="text-terminal-text-bright font-mono text-sm font-bold">
        {children}
      </h2>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-terminal-text hover:text-terminal-text-bright transition-colors cursor-pointer leading-none"
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  )
}

export function ModalBody({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

export function ModalFooter({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex items-center justify-end gap-2 px-4 py-3 border-t border-terminal-border ${className}`}
    >
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, size = 'md', footer, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useDialogA11y(open, onClose, panelRef)

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-cmd-overlay p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`bg-terminal-elevated border border-terminal-border rounded-xl shadow-overlay animate-cmd-content w-full ${SIZE_MAX_W[size]} max-h-[85vh] overflow-y-auto focus:outline-none`}
      >
        {title && (
          <ModalHeader id={titleId} onClose={onClose}>
            {title}
          </ModalHeader>
        )}
        {children}
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </div>
    </div>,
    document.body,
  )
}
