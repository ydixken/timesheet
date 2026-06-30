import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { useNavDrawer } from '../../store/navDrawer'
import { useAuthStore } from '../../store/auth'
import { useDialogA11y } from '../ui/Modal'
import { navItems } from './nav-items'

/**
 * Mobile-only slide-in navigation drawer. Exposes every destination plus logout.
 * Reuses the modal a11y primitive (scroll-lock, focus-trap, Escape, focus restore).
 * Hidden at md+ and rendered only while open.
 */
export function NavDrawer() {
  const open = useNavDrawer((s) => s.open)
  const close = useNavDrawer((s) => s.close)
  const logout = useAuthStore((s) => s.logout)
  const panelRef = useRef<HTMLDivElement>(null)

  useDialogA11y(open, close, panelRef)

  if (!open) return null

  return createPortal(
    <div className="md:hidden">
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-cmd-overlay"
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="navigation"
        tabIndex={-1}
        className="fixed left-0 inset-y-0 z-50 w-64 bg-terminal-bg-light border-r border-terminal-border animate-cmd-content overflow-y-auto flex flex-col focus:outline-none"
      >
        <div className="p-5 border-b border-terminal-border">
          <h1 className="font-mono text-lg font-bold">
            <span className="text-terminal-green">~/</span>
            <span className="text-terminal-text-bright">timesheet</span>
            <span className="animate-blink text-terminal-green">_</span>
          </h1>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={close}
              className={({ isActive }) =>
                `block px-5 py-2 font-mono text-sm transition-colors duration-150 border-l-2 tap-target ${
                  isActive
                    ? 'text-terminal-green border-terminal-green bg-terminal-green/5'
                    : 'text-terminal-text border-transparent hover:text-terminal-text-bright hover:border-terminal-border'
                }`
              }
            >
              [{label}]
            </NavLink>
          ))}
        </nav>

        <div className="p-5 border-t border-terminal-border">
          <button
            type="button"
            onClick={logout}
            className="font-mono text-sm text-terminal-danger hover:text-terminal-danger/80 transition-colors cursor-pointer tap-target"
          >
            $ logout
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
