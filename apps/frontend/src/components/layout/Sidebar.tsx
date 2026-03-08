import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'

const navItems = [
  { to: '/', label: 'dashboard' },
  { to: '/tracker', label: 'tracker' },
  { to: '/timesheet', label: 'timesheet' },
  { to: '/calendar', label: 'calendar' },
  { to: '/reports', label: 'reports' },
  { to: '/projects', label: 'projects' },
  { to: '/clients', label: 'clients' },
]

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout)

  return (
    <aside className="w-56 h-screen bg-terminal-bg-light border-r border-terminal-border flex flex-col fixed left-0 top-0 z-20">
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
            className={({ isActive }) =>
              `block px-5 py-2 font-mono text-sm transition-colors duration-150 border-l-2 ${
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
          onClick={logout}
          className="font-mono text-sm text-terminal-danger hover:text-terminal-danger/80 transition-colors cursor-pointer"
        >
          $ logout
        </button>
      </div>
    </aside>
  )
}
