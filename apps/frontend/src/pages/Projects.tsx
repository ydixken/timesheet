import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Project, CreateProjectInput, Client } from '@timesheet/shared'
import { useProjects } from '../hooks/useProjects'
import { useClients } from '../hooks/useClients'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { SkeletonCard } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ZipExportModal } from '../components/ZipExportModal'

type ProjectWithClient = Project & { clientName: string | null }
type Filter = 'all' | 'active' | 'archived'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

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
    try {
      await create(data)
      setShowCreate(false)
      fetchProjects(filter)
    } catch {
      // failure is already surfaced via a toast from the projects store
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="page-heading text-2xl font-bold text-terminal-text-bright font-mono">
          projects
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setShowZipExport(true)}>
            [export month]
          </Button>
          <Button variant="filled" onClick={() => setShowCreate(true)}>
            [+ new]
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <SegmentedControl
          options={FILTERS}
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
        />
      </div>

      {/* Create form (inline) */}
      {showCreate && (
        <CreateProjectForm
          clients={clients}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Project cards */}
      {loading && projects.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          prompt="no projects"
          message="Create a project to start tracking time and revenue against it."
          action={{ label: '+ new', onClick: () => setShowCreate(true) }}
        />
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
    <Card
      interactive
      onClick={onClick}
      className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60 active:translate-y-px"
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
              <span className="text-terminal-green font-data text-sm">
                {formatEuro(rate)}/h
              </span>
            ) : (
              <span className="text-terminal-text font-mono text-sm">No rate</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={project.active ? 'success' : 'muted'}>
              {project.active ? 'Active' : 'Archived'}
            </Badge>
            <Badge variant={project.billable ? 'info' : 'muted'}>
              {project.billable ? 'Billable' : 'Not billable'}
            </Badge>
          </div>
        </div>
        {budget !== null && (
          <div className="text-right shrink-0 min-w-[140px]">
            <p className="text-terminal-text font-mono text-xs mb-1">
              Budget: <span className="font-data text-terminal-text-bright">{budget}h</span>
            </p>
          </div>
        )}
      </div>
    </Card>
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
    <Card accent className="mb-6 animate-fade-in">
      <div className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em] mb-4">
        <span className="text-terminal-green">$ </span>new project
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            autoFocus
          />
          <Select
            label="Client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full"
          >
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
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
          <Select
            label="Time Rounding"
            value={roundingMin}
            onChange={(e) => setRoundingMin(e.target.value)}
            className="w-full"
          >
            <option value="">No rounding</option>
            <option value="5">5 min</option>
            <option value="10">10 min</option>
            <option value="15">15 min (quarter hour)</option>
            <option value="30">30 min (half hour)</option>
          </Select>
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
    </Card>
  )
}
