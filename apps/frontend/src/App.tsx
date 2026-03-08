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
      <div className="flex min-h-screen bg-terminal-bg">
        <Sidebar />
        <main className="flex-1 ml-56 p-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
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
