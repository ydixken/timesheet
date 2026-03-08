import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { ProjectStatus, Client, UpdateProjectInput, Task } from '@timesheet/shared'
import { api } from '../api/client'
import { useClients } from '../hooks/useClients'
import { useTasks } from '../hooks/useTasks'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PdfPreviewModal } from '../components/PdfPreviewModal'
import { formatDecimalHours } from '../lib/time'

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
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
    try {
      await api.put(`/projects/${id}`, { active: !status.project.active })
      fetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update project')
    }
  }

  const handleUpdate = async (data: UpdateProjectInput) => {
    if (!id) return
    setError(null)
    try {
      await api.put(`/projects/${id}`, data)
      setShowEdit(false)
      fetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update project')
    }
  }

  if (loading && !status) {
    return (
      <div>
        <p className="text-terminal-text font-mono text-sm">Loading...</p>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div>
        <p className="text-terminal-danger font-mono text-sm">{error}</p>
        <Button className="mt-4" onClick={() => navigate('/projects')}>
          Back to projects
        </Button>
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
  const billablePct = status.totalMinutes > 0
    ? (status.billableMinutes / status.totalMinutes) * 100
    : 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="text-terminal-text hover:text-terminal-green font-mono text-sm transition-colors cursor-pointer"
          >
            $ projects
          </button>
          <span className="text-terminal-text font-mono">/</span>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-2xl font-bold text-terminal-text-bright font-mono">
              {project.name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {error && <p className="text-terminal-danger font-mono text-sm mb-4">{error}</p>}

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Tracked" value={`${formatDecimalHours(status.totalMinutes)}h`} />
        <KpiCard label="Billable" value={`${formatDecimalHours(status.billableMinutes)}h`} />
        <KpiCard
          label="Budget"
          value={
            budget !== null
              ? `${Math.max(budget - trackedHours, 0).toFixed(1)}h left`
              : '--'
          }
        />
        <KpiCard
          label="Earned"
          value={earned !== null ? formatEuro(earned) : '--'}
          highlight
        />
      </div>

      {/* Progress bars */}
      <div className="bg-terminal-bg-light border border-terminal-border rounded-lg p-4 mb-6">
        {budgetUsedPct !== null && (
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-terminal-text font-mono text-sm">Budget Progress</span>
              <span className="text-terminal-text-bright font-mono text-sm">
                {budgetUsedPct.toFixed(0)}% ({trackedHours.toFixed(1)} / {budget}h)
              </span>
            </div>
            <div className="w-full h-2 bg-terminal-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  budgetUsedPct >= 90 ? 'bg-terminal-danger' : 'bg-terminal-green'
                }`}
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>
          </div>
        )}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-terminal-text font-mono text-sm">Billable vs Non-billable</span>
            <span className="text-terminal-text-bright font-mono text-sm">
              {billablePct.toFixed(0)}% billable
            </span>
          </div>
          <div className="w-full h-2 bg-terminal-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-terminal-blue rounded-full transition-all duration-300"
              style={{ width: `${billablePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-terminal-bg-light border border-terminal-border rounded-lg p-4">
        <h2 className="text-terminal-text-bright font-mono text-sm font-bold mb-4">Tasks</h2>
        {tasksLoading && tasks.length === 0 ? (
          <p className="text-terminal-text font-mono text-sm">Loading tasks...</p>
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
      </div>

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

function KpiCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="bg-terminal-bg-light border border-terminal-border rounded-lg p-4">
      <p className="text-terminal-text font-mono text-xs mb-1">{label}</p>
      <p
        className={`font-mono text-2xl font-bold truncate ${
          highlight ? 'text-terminal-green' : 'text-terminal-text-bright'
        }`}
      >
        {value}
      </p>
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
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const taskMinutesMap = new Map(statusTasks.map((t) => [t.id, t.totalMinutes]))

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAddError(null)
    try {
      await onCreateTask({ projectId, name: newName.trim(), billable: newBillable, active: true })
      setNewName('')
      setNewBillable(true)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add task')
    }
  }

  const handleEditSave = async (task: Task) => {
    if (!editName.trim()) return
    try {
      await onUpdateTask(task.id, { name: editName.trim() })
      setEditingId(null)
    } catch {
      // keep editing open on error
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await onRemoveTask(id)
      setDeletingId(null)
    } catch {
      // keep confirm open on error
    }
  }

  return (
    <div>
      {tasks.length > 0 && (
        <table className="w-full font-mono text-sm mb-4">
          <thead>
            <tr className="text-terminal-text text-left border-b border-terminal-border">
              <th className="pb-2 font-normal">Task</th>
              <th className="pb-2 font-normal w-20 text-right">Hours</th>
              <th className="pb-2 font-normal w-20 text-center">Billable</th>
              <th className="pb-2 font-normal w-20 text-center">Active</th>
              <th className="pb-2 font-normal w-28"></th>
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
                  className="border-b border-terminal-border/50 hover:bg-terminal-surface/30"
                >
                  <td className="py-2 text-terminal-text-bright">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(task)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-2 py-1 rounded text-sm focus:outline-none focus:border-terminal-green w-full"
                          autoFocus
                        />
                      </div>
                    ) : (
                      task.name
                    )}
                  </td>
                  <td className="py-2 text-right text-terminal-green">
                    {formatDecimalHours(minutes)}h
                  </td>
                  <td className="py-2 text-center">
                    <button
                      onClick={() => onUpdateTask(task.id, { billable: !task.billable })}
                      className="cursor-pointer hover:opacity-80"
                    >
                      {task.billable ? (
                        <span className="text-terminal-green">&#10003;</span>
                      ) : (
                        <span className="text-terminal-text">&#10007;</span>
                      )}
                    </button>
                  </td>
                  <td className="py-2 text-center">
                    <button
                      onClick={() => onUpdateTask(task.id, { active: !task.active })}
                      className="cursor-pointer hover:opacity-80"
                    >
                      {task.active ? (
                        <span className="text-terminal-green">&#10003;</span>
                      ) : (
                        <span className="text-terminal-text">&#10007;</span>
                      )}
                    </button>
                  </td>
                  <td className="py-2 text-right">
                    {isDeleting ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-terminal-danger text-xs font-mono cursor-pointer hover:underline"
                        >
                          confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-terminal-text text-xs font-mono cursor-pointer hover:underline"
                        >
                          cancel
                        </button>
                      </div>
                    ) : isEditing ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleEditSave(task)}
                          className="text-terminal-green text-xs font-mono cursor-pointer hover:underline"
                        >
                          save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-terminal-text text-xs font-mono cursor-pointer hover:underline"
                        >
                          cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => {
                            setEditingId(task.id)
                            setEditName(task.name)
                          }}
                          className="text-terminal-text hover:text-terminal-green text-xs font-mono cursor-pointer"
                        >
                          edit
                        </button>
                        <button
                          onClick={() => setDeletingId(task.id)}
                          className="text-terminal-text hover:text-terminal-danger text-xs font-mono cursor-pointer"
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
      )}

      {/* Add task row */}
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="New task name..."
          className="flex-1 bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30 placeholder:text-terminal-text/50"
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
      {addError && <p className="text-terminal-danger font-mono text-xs mt-1">{addError}</p>}
    </div>
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
        roundingMin: roundingMin ? (parseInt(roundingMin) as 5 | 6 | 10 | 15 | 30) : null,
      })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-terminal-bg-light border border-terminal-green rounded-lg p-4 mb-6">
      <h2 className="text-terminal-text-bright font-mono text-sm font-bold mb-4">Edit Project</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <div className="flex flex-col gap-1">
            <label className="text-sm text-terminal-text-bright font-mono">Time Rounding</label>
            <select
              value={roundingMin}
              onChange={(e) => setRoundingMin(e.target.value)}
              className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30"
            >
              <option value="">No rounding</option>
              <option value="5">5 min</option>
              <option value="6">6 min (0.1h)</option>
              <option value="10">10 min</option>
              <option value="15">15 min (quarter hour)</option>
              <option value="30">30 min (half hour)</option>
            </select>
          </div>
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
    </div>
  )
}
