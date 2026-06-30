import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { ProjectStatus, Client, UpdateProjectInput, Task } from '@timesheet/shared'
import { computeBudgetStatus, budgetLevelColors } from '@timesheet/shared'
import { api } from '../api/client'
import { useClients } from '../hooks/useClients'
import { useTasks } from '../hooks/useTasks'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Select } from '../components/ui/Select'
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { PdfPreviewModal } from '../components/PdfPreviewModal'
import { toast } from '../store/toasts'
import { formatDecimalHours } from '../lib/time'

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

// Reproduce the original budgetLevelColors() value colors within the design-system
// primitives: an exact hex for the ProgressBar fill and the nearest StatCard tone.
const budgetBarHex: Record<'ok' | 'warning' | 'danger' | 'exceeded', string> = {
  ok: '#39ff14',
  warning: '#f1fa8c',
  danger: '#ff5555',
  exceeded: '#ff5555',
}

const budgetTone: Record<'ok' | 'warning' | 'danger' | 'exceeded', 'green' | 'warning' | 'danger'> = {
  ok: 'green',
  warning: 'warning',
  danger: 'danger',
  exceeded: 'danger',
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { clients, fetch: fetchClients } = useClients()
  const { tasks, loading: tasksLoading, fetch: fetchTasks, create: createTask, update: updateTask, remove: removeTask } = useTasks()

  const [status, setStatus] = useState<ProjectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [pdfModalOpen, setPdfModalOpen] = useState(false)

  const fetchStatus = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<ProjectStatus>(`/projects/${id}/status`)
      setStatus(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchStatus()
    fetchClients()
    if (id) fetchTasks(id)
  }, [id, fetchStatus, fetchClients, fetchTasks])

  const handleArchiveToggle = async () => {
    if (!status || !id) return
    const willArchive = status.project.active
    try {
      await api.put(`/projects/${id}`, { active: !status.project.active })
      toast({ variant: 'success', message: willArchive ? 'Project archived' : 'Project activated' })
      fetchStatus()
    } catch (e) {
      toast({ variant: 'danger', message: e instanceof Error ? e.message : 'Failed to update project' })
    }
  }

  const handleUpdate = async (data: UpdateProjectInput) => {
    if (!id) return
    try {
      await api.put(`/projects/${id}`, data)
      setShowEdit(false)
      toast({ variant: 'success', message: 'Project updated' })
      fetchStatus()
    } catch (e) {
      toast({ variant: 'danger', message: e instanceof Error ? e.message : 'Failed to update project' })
    }
  }

  if (loading && !status) {
    return (
      <div className="animate-fade-in">
        {/* Header skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Skeleton className="h-8 w-56" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        {/* KPI skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        {/* Progress skeleton */}
        <Card className="mb-6">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-2 w-full mt-2" />
          <Skeleton className="h-3 w-40 mt-4" />
          <Skeleton className="h-2 w-full mt-2" />
        </Card>
        {/* Tasks skeleton */}
        <Skeleton className="h-3 w-16 mb-3" />
        <Card padding="none" className="overflow-hidden">
          <div className="bg-terminal-surface h-10" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-terminal-border/50 last:border-0">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </Card>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => navigate('/projects')}
          className="text-terminal-text hover:text-terminal-green font-mono text-sm transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
        >
          $ projects
        </button>
        <ErrorState message={error} onRetry={fetchStatus} />
      </div>
    )
  }

  if (!status) return null

  const { project } = status
  const rate = project.hourlyRate ? parseFloat(project.hourlyRate) : null
  const budget = project.estimatedHours ? parseFloat(project.estimatedHours) : null
  const trackedHours = status.totalMinutes / 60
  const billableHours = status.billableMinutes / 60
  const earned = rate !== null ? billableHours * rate : null
  const budgetUsedPct = budget ? Math.min((trackedHours / budget) * 100, 100) : null
  const budgetStatus = computeBudgetStatus(project.estimatedHours, status.totalMinutes)
  const budgetColors = budgetLevelColors(budgetStatus.level)
  const billablePct = status.totalMinutes > 0
    ? (status.billableMinutes / status.totalMinutes) * 100
    : 0

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/projects')}
            className="text-terminal-text hover:text-terminal-green font-mono text-sm transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60 shrink-0"
          >
            $ projects
          </button>
          <span className="text-terminal-text-muted font-mono shrink-0">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-2xl font-bold text-terminal-text-bright font-mono truncate">
              {project.name}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setPdfModalOpen(true)} className="border-terminal-blue text-terminal-blue hover:bg-terminal-blue hover:text-terminal-bg">
            [export pdf]
          </Button>
          <Button onClick={() => setShowEdit(true)}>[edit]</Button>
          <Button
            variant={project.active ? 'danger' : 'outline'}
            onClick={handleArchiveToggle}
          >
            {project.active ? '[archive]' : '[activate]'}
          </Button>
        </div>
      </div>

      {/* Edit form */}
      {showEdit && (
        <EditProjectForm
          project={project}
          clients={clients}
          onSubmit={handleUpdate}
          onCancel={() => setShowEdit(false)}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard className="min-w-0" label="Tracked" value={`${formatDecimalHours(status.totalMinutes)}h`} tone="bright" />
        <StatCard className="min-w-0" label="Billable" value={`${formatDecimalHours(status.billableMinutes)}h`} tone="bright" />
        <StatCard
          className="min-w-0"
          label="Budget"
          value={
            budget !== null
              ? `${Math.max(budget - trackedHours, 0).toFixed(1)}h left`
              : '--'
          }
          tone={budget !== null ? budgetTone[budgetStatus.level] : 'muted'}
        />
        <StatCard
          className="min-w-0"
          label="Earned"
          value={earned !== null ? formatEuro(earned) : '--'}
          tone={earned !== null ? 'green' : 'muted'}
        />
      </div>

      {/* Progress bars */}
      <Card className="mb-6">
        {budgetUsedPct !== null && (
          <div className="mb-4">
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-terminal-text-muted font-mono">Budget Progress</span>
              <span className={`${budgetColors.text} font-data`}>
                {budgetUsedPct.toFixed(0)}% ({trackedHours.toFixed(1)} / {budget}h)
              </span>
            </div>
            <ProgressBar value={budgetUsedPct} color={budgetBarHex[budgetStatus.level]} />
          </div>
        )}
        <div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-terminal-text-muted font-mono">Billable vs Non-billable</span>
            <span className="text-terminal-text-bright font-data">
              {billablePct.toFixed(0)}% billable
            </span>
          </div>
          <ProgressBar value={billablePct} color="#00d9ff" />
        </div>
      </Card>

      {/* Tasks */}
      <section>
        <div className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em] mb-3">
          <span className="text-terminal-green"># </span>tasks
        </div>
        {tasksLoading && tasks.length === 0 ? (
          <Card padding="none" className="overflow-hidden">
            <div className="bg-terminal-surface h-10" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-terminal-border/50 last:border-0">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </Card>
        ) : (
          <TasksTable
            tasks={tasks}
            statusTasks={status.tasks}
            projectId={id!}
            onCreateTask={createTask}
            onUpdateTask={updateTask}
            onRemoveTask={removeTask}
          />
        )}
      </section>

      <PdfPreviewModal
        projectId={id!}
        projectName={project.name}
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        roundingMin={project.roundingMin}
      />
    </div>
  )
}

function TasksTable({
  tasks,
  statusTasks,
  projectId,
  onCreateTask,
  onUpdateTask,
  onRemoveTask,
}: {
  tasks: Task[]
  statusTasks: { id: string; name: string; totalMinutes: number }[]
  projectId: string
  onCreateTask: (data: { projectId: string; name: string; billable: boolean; active: boolean }) => Promise<void>
  onUpdateTask: (id: string, data: { name?: string; billable?: boolean; active?: boolean }) => Promise<void>
  onRemoveTask: (id: string) => Promise<void>
}) {
  const [newName, setNewName] = useState('')
  const [newBillable, setNewBillable] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const taskMinutesMap = new Map(statusTasks.map((t) => [t.id, t.totalMinutes]))

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      await onCreateTask({ projectId, name: newName.trim(), billable: newBillable, active: true })
      setNewName('')
      setNewBillable(true)
    } catch (e) {
      toast({ variant: 'danger', message: e instanceof Error ? e.message : 'Failed to add task' })
    }
  }

  const handleToggle = async (id: string, data: { billable?: boolean; active?: boolean }) => {
    try {
      await onUpdateTask(id, data)
    } catch {
      toast({ variant: 'danger', message: 'Failed to update task' })
    }
  }

  const handleEditSave = async (task: Task) => {
    if (!editName.trim()) return
    try {
      await onUpdateTask(task.id, { name: editName.trim() })
      setEditingId(null)
    } catch {
      toast({ variant: 'danger', message: 'Failed to update task' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await onRemoveTask(id)
      setDeletingId(null)
    } catch {
      toast({ variant: 'danger', message: 'Failed to delete task' })
    }
  }

  return (
    <Card padding="none" className="overflow-hidden">
      {tasks.length > 0 ? (
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="bg-terminal-surface text-[11px] uppercase tracking-wide text-terminal-text-muted">
              <th className="text-left font-normal px-4 py-3">Task</th>
              <th className="text-right font-normal px-4 py-3 w-24">Hours</th>
              <th className="text-center font-normal px-4 py-3 w-20">Billable</th>
              <th className="text-center font-normal px-4 py-3 w-20">Active</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const minutes = taskMinutesMap.get(task.id) ?? 0
              const isEditing = editingId === task.id
              const isDeleting = deletingId === task.id

              return (
                <tr
                  key={task.id}
                  className="border-b border-terminal-border/50 last:border-0 hover:bg-terminal-surface/30 focus-within:bg-terminal-surface/30 transition-colors"
                >
                  <td className="px-4 py-2 text-terminal-text-bright">
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave(task)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-2 py-1 rounded text-sm focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30 w-full"
                        autoFocus
                      />
                    ) : (
                      task.name
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-terminal-green font-data">
                    {formatDecimalHours(minutes)}h
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleToggle(task.id, { billable: !task.billable })}
                      className="cursor-pointer hover:opacity-80 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                      aria-label={task.billable ? 'Mark non-billable' : 'Mark billable'}
                    >
                      {task.billable ? (
                        <span className="text-terminal-green">&#10003;</span>
                      ) : (
                        <span className="text-terminal-text-muted">&#10007;</span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleToggle(task.id, { active: !task.active })}
                      className="cursor-pointer hover:opacity-80 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                      aria-label={task.active ? 'Deactivate task' : 'Activate task'}
                    >
                      {task.active ? (
                        <span className="text-terminal-green">&#10003;</span>
                      ) : (
                        <span className="text-terminal-text-muted">&#10007;</span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {isDeleting ? (
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-terminal-danger text-xs font-mono cursor-pointer hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-danger/60"
                        >
                          confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-terminal-text-muted text-xs font-mono cursor-pointer hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                        >
                          cancel
                        </button>
                      </div>
                    ) : isEditing ? (
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleEditSave(task)}
                          className="text-terminal-green text-xs font-mono cursor-pointer hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                        >
                          save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-terminal-text-muted text-xs font-mono cursor-pointer hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                        >
                          cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => {
                            setEditingId(task.id)
                            setEditName(task.name)
                          }}
                          className="text-terminal-text-muted hover:text-terminal-green text-xs font-mono cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                        >
                          edit
                        </button>
                        <button
                          onClick={() => setDeletingId(task.id)}
                          className="text-terminal-text-muted hover:text-terminal-danger text-xs font-mono cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-danger/60"
                        >
                          del
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="font-prose text-sm text-terminal-text-muted px-4 py-6">
          No tasks yet. Add one below to break this project into billable work items.
        </p>
      )}

      {/* Add task row */}
      <div className="flex flex-wrap items-center gap-2 border-t border-terminal-border px-4 py-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="New task name..."
          className="flex-1 min-w-[10rem] bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30 placeholder:text-terminal-text-muted"
        />
        <label className="flex items-center gap-1.5 text-sm text-terminal-text-bright font-mono shrink-0">
          <input
            type="checkbox"
            checked={newBillable}
            onChange={(e) => setNewBillable(e.target.checked)}
            className="accent-terminal-green"
          />
          Billable
        </label>
        <Button onClick={handleAdd} className="shrink-0">
          [+ add task]
        </Button>
      </div>
    </Card>
  )
}

function EditProjectForm({
  project,
  clients,
  onSubmit,
  onCancel,
}: {
  project: ProjectStatus['project']
  clients: Client[]
  onSubmit: (data: UpdateProjectInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(project.name)
  const [clientId, setClientId] = useState(project.clientId ?? '')
  const [color, setColor] = useState(project.color)
  const [hourlyRate, setHourlyRate] = useState(project.hourlyRate ?? '')
  const [estimatedHours, setEstimatedHours] = useState(project.estimatedHours ?? '')
  const [billable, setBillable] = useState(project.billable)
  const [showAmount, setShowAmount] = useState(project.showAmount)
  const [roundingMin, setRoundingMin] = useState(project.roundingMin ? String(project.roundingMin) : '')
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
        hourlyRate: hourlyRate ? parseFloat(String(hourlyRate)) : null,
        estimatedHours: estimatedHours ? parseFloat(String(estimatedHours)) : null,
        billable,
        showAmount,
        roundingMin: roundingMin ? (parseInt(roundingMin) as 5 | 10 | 15 | 30) : null,
      })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card accent className="mb-6 animate-fade-in">
      <div className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em] mb-4">
        <span className="text-terminal-green">$ </span>edit project
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
                id="edit-billable"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="accent-terminal-green"
              />
              <label htmlFor="edit-billable" className="text-sm text-terminal-text-bright font-mono">
                Billable
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-showAmount"
                checked={showAmount}
                onChange={(e) => setShowAmount(e.target.checked)}
                className="accent-terminal-green"
              />
              <label htmlFor="edit-showAmount" className="text-sm text-terminal-text-bright font-mono">
                Show amount in PDF
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
            {submitting ? 'Saving...' : 'Save'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
