import { useEffect } from 'react'
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { Sidebar } from './components/layout/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { Tracker } from './pages/Tracker'
import { Timesheet } from './pages/Timesheet'
import { Calendar } from './pages/Calendar'
import { Reports } from './pages/Reports'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { Clients } from './pages/Clients'
import { CommandPalette } from './components/CommandPalette'
import { Toaster } from './components/ui/Toaster'
import { MobileTopBar } from './components/layout/MobileTopBar'
import { BottomNav } from './components/layout/BottomNav'
import { NavDrawer } from './components/layout/NavDrawer'

function OidcCallback() {
  const initialize = useAuthStore((s) => s.initialize)
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true })
    }
  }, [loading, user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
      <span className="text-terminal-green font-mono animate-blink">authenticating...</span>
    </div>
  )
}

function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
        <span className="text-terminal-green font-mono animate-blink">initializing...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <div className="flex flex-col min-h-screen bg-terminal-bg">
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 md:ml-56 p-4 md:p-8 pt-14 md:pt-8 pb-24 md:pb-8">
            <Outlet />
          </main>
        </div>
        <footer className="md:ml-56 py-2 text-center font-mono text-xs text-terminal-text-faint">
          2026 | ./timesheet is made with &lt;3 in Berlin |{' '}
          <a href="https://dixken.de" target="_blank" rel="noopener noreferrer" className="hover:text-terminal-text-muted underline">dixken.de</a>
        </footer>
      </div>
      <MobileTopBar />
      <BottomNav />
      <NavDrawer />
      <CommandPalette />
      <Toaster />
    </>
  )
}

export function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    if (window.location.pathname !== '/auth/callback') {
      initialize()
    }
  }, [initialize])

  return (
    <Routes>
      <Route path="/auth/callback" element={<OidcCallback />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/timesheet" element={<Timesheet />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/clients" element={<Clients />} />
      </Route>
    </Routes>
  )
}
