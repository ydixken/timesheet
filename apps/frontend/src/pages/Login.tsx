import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-terminal-bg-light border border-terminal-border rounded-lg overflow-hidden">
          {/* Terminal window header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-terminal-bg border-b border-terminal-border">
            <div className="w-3 h-3 rounded-full bg-terminal-danger" />
            <div className="w-3 h-3 rounded-full bg-terminal-warning" />
            <div className="w-3 h-3 rounded-full bg-terminal-success" />
            <span className="ml-2 text-xs text-terminal-text font-mono">login</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <h2 className="text-lg font-mono font-bold text-terminal-text-bright">
              <span className="text-terminal-green">$ </span>timesheet login
            </h2>

            <Input
              label="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />

            <Input
              label="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              autoComplete="current-password"
              required
            />

            {error && (
              <p className="text-sm text-terminal-danger font-mono">error: {error}</p>
            )}

            <Button type="submit" disabled={submitting} className="mt-2 w-full">
              {submitting ? 'authenticating...' : '[login]'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
