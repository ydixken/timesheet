import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Project, CreateProjectInput, Client } from '@timesheet/shared'
import { useProjects } from '../hooks/useProjects'
import { useClients } from '../hooks/useClients'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ZipExportModal } from '../components/ZipExportModal'
import { formatDecimalHours } from '../lib/time'

type ProjectWithClient = Project & { clientName: string | null }
type Filter = 'all' | 'active' | 'archived'

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function Projects() {
  const navigate = useNavigate()
  const { projects, loading, fetch: fetchProjects, create } = useProjects()
  const { clients, fetch: fetchClients } = useClients()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showZipExport, setShowZipExport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects(filter)
    fetchClients()
  }, [filter, fetchProjects, fetchClients])

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'create') {
      setShowCreate(true)
      setSearchParams({}, { replace: true })
    } else if (action === 'export') {
      setShowZipExport(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = (projects as ProjectWithClient[]).filter((p) => {
    if (filter === 'active') return p.active
    if (filter === 'archived') return !p.active
    return true
  })

  const handleCreate = async (data: CreateProjectInput) => {
    setError(null)
    try {
      await create(data)
      setShowCreate(false)
      fetchProjects(filter)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create project')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-heading text-2xl font-bold text-terminal-text-bright font-mono">
          projects
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowZipExport(true)}>
            [export month]
          </Button>
          <Button variant="filled" onClick={() => setShowCreate(true)}>
            [+ new]
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        {(['all', 'active', 'archived'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded font-mono text-sm transition-all duration-150 cursor-pointer border capitalize ${
              filter === f
                ? 'bg-terminal-green text-terminal-bg border-terminal-green'
                : 'border-terminal-border text-terminal-text hover:border-terminal-green hover:text-terminal-green'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="text-terminal-danger font-mono text-sm mb-4">{error}</p>}

      {/* Create modal */}
      {showCreate && (
        <CreateProjectForm
          clients={clients}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Project cards */}
      {loading && projects.length === 0 ? (
        <p className="text-terminal-text font-mono text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-terminal-text font-mono text-sm">No projects found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}

      <ZipExportModal
        isOpen={showZipExport}
        onClose={() => setShowZipExport(false)}
      />
    </div>
  )
}

function ProjectCard({
  project,
  onClick,
}: {
  project: ProjectWithClient
  onClick: () => void
}) {
  const rate = project.hourlyRate ? parseFloat(project.hourlyRate) : null
  const budget = project.estimatedHours ? parseFloat(project.estimatedHours) : null

  return (
    <div
      onClick={onClick}
      className="bg-terminal-bg-light border border-terminal-border rounded-lg p-4 cursor-pointer hover:border-terminal-green transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <span className="text-terminal-text-bright font-mono font-bold text-base truncate">
              {project.name}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {project.clientName && (
              <span className="text-terminal-text font-mono text-sm">
                Client: {project.clientName}
              </span>
            )}
            {rate !== null ? (
              <span className="text-terminal-green font-mono text-sm">
                {formatEuro(rate)}/h
              </span>
            ) : (
              <span className="text-terminal-text font-mono text-sm">No rate</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono border ${
                project.active
                  ? 'text-terminal-green border-terminal-green'
                  : 'text-terminal-text border-terminal-border'
              }`}
            >
              {project.active ? 'Active' : 'Archived'}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono border ${
                project.billable
                  ? 'text-terminal-blue border-terminal-blue'
                  : 'text-terminal-text border-terminal-border'
              }`}
            >
              {project.billable ? 'Billable' : 'Not billable'}
            </span>
          </div>
        </div>
        {budget !== null && (
          <div className="text-right shrink-0 min-w-[140px]">
            <p className="text-terminal-text font-mono text-xs mb-1">
              Budget: {budget}h
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function CreateProjectForm({
  clients,
  onSubmit,
  onCancel,
}: {
  clients: Client[]
  onSubmit: (data: CreateProjectInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [color, setColor] = useState('#39ff14')
  const [hourlyRate, setHourlyRate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [billable, setBillable] = useState(true)
  const [showAmount, setShowAmount] = useState(true)
  const [roundingMin, setRoundingMin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Name is required')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await onSubmit({
        name: name.trim(),
        clientId: clientId || null,
        color,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        billable,
        showAmount,
        roundingMin: roundingMin ? (parseInt(roundingMin) as 5 | 10 | 15 | 30) : null,
        active: true,
      })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-terminal-bg-light border border-terminal-green rounded-lg p-4 mb-6">
      <h2 className="text-terminal-text-bright font-mono text-sm font-bold mb-4">
        New Project
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-terminal-text-bright font-mono">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30"
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-terminal-text-bright font-mono">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded border border-terminal-border bg-terminal-surface cursor-pointer"
              />
              <span className="text-terminal-text font-mono text-sm">{color}</span>
            </div>
          </div>
          <Input
            label="Hourly Rate (EUR)"
            type="number"
            step="0.01"
            min="0"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="e.g. 150"
          />
          <Input
            label="Estimated Hours"
            type="number"
            step="0.5"
            min="0"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            placeholder="e.g. 200"
          />
          <div className="flex items-center gap-4 self-end pb-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="billable"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="accent-terminal-green"
              />
              <label htmlFor="billable" className="text-sm text-terminal-text-bright font-mono">
                Billable
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showAmount"
                checked={showAmount}
                onChange={(e) => setShowAmount(e.target.checked)}
                className="accent-terminal-green"
              />
              <label htmlFor="showAmount" className="text-sm text-terminal-text-bright font-mono">
                Show amount
              </label>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-terminal-text-bright font-mono">Time Rounding</label>
            <select
              value={roundingMin}
              onChange={(e) => setRoundingMin(e.target.value)}
              className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30"
            >
              <option value="">No rounding</option>
              <option value="5">5 min</option>
              <option value="10">10 min</option>
              <option value="15">15 min (quarter hour)</option>
              <option value="30">30 min (half hour)</option>
            </select>
          </div>
        </div>
        {formError && <p className="text-terminal-danger font-mono text-sm">{formError}</p>}
        <div className="flex items-center gap-2">
          <Button type="submit" variant="filled" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
