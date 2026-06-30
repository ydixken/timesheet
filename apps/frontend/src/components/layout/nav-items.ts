export interface NavItem {
  to: string
  label: string
  /** Surfaced in the mobile bottom nav; non-primary items live in the drawer. */
  primary: boolean
}

export const navItems: NavItem[] = [
  { to: '/', label: 'dashboard', primary: true },
  { to: '/tracker', label: 'tracker', primary: true },
  { to: '/timesheet', label: 'timesheet', primary: true },
  { to: '/calendar', label: 'calendar', primary: true },
  { to: '/reports', label: 'reports', primary: false },
  { to: '/projects', label: 'projects', primary: false },
  { to: '/clients', label: 'clients', primary: false },
]
