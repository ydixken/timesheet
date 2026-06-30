import { NavLink } from 'react-router-dom'
import { useNavDrawer } from '../../store/navDrawer'
import { navItems } from './nav-items'

const primaryItems = navItems.filter((i) => i.primary)

/** Mobile-only bottom tab bar: primary destinations + a drawer trigger. Hidden at md+. */
export function BottomNav() {
  return (
    <nav
      aria-label="primary"
      className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-terminal-bg-light border-t border-terminal-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex">
        {primaryItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `tap-target flex-1 min-w-0 flex items-center justify-center px-0.5 py-2 font-mono text-xs transition-colors ${
                isActive
                  ? 'text-terminal-green'
                  : 'text-terminal-text hover:text-terminal-text-bright'
              }`
            }
          >
            <span className="truncate">[{label}]</span>
          </NavLink>
        ))}

        <button
          type="button"
          aria-label="More navigation"
          onClick={() => useNavDrawer.getState().openDrawer()}
          className="tap-target flex-1 min-w-0 flex items-center justify-center px-0.5 py-2 font-mono text-xs text-terminal-text hover:text-terminal-text-bright transition-colors cursor-pointer"
        >
          <span className="truncate">[more]</span>
        </button>
      </div>
    </nav>
  )
}
