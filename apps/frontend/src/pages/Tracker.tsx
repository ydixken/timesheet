import { useEffect, useState, useCallback, useMemo } from 'react'
import type { CreateEntryInput, Project } from '@timesheet/shared'
import type { EntryWithProject } from '../types'
import { useEntries } from '../hooks/useEntries'
import { useProjects } from '../hooks/useProjects'
import { ProjectBadge } from '../components/ProjectBadge'
import { ProjectSelector } from '../components/ProjectSelector'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import {
  formatDuration,
  formatTimeRange,
  parseHoursToMinutes,
  getMonthDates,
  formatDateHeading,
  groupEntriesByDate,
} from '../lib/time'
import { useBudgetAlerts } from '../hooks/useBudgetAlerts'

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function computeDurationFromTimes(start: string, end: string): number | null {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  return mins > 0 ? mins : null
}

export function Tracker() {
  const { entries, loading, fetch: fetchEntries, create, update, remove } = useEntries()
  const { projects, fetch: fetchProjects } = useProjects()
  const checkBudget = useBudgetAlerts((s) => s.checkBudget)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [entryDate, setEntryDate] = useState(todayStr)
  const [billable, setBillable] = useState(true)
  const [timeMode, setTimeMode] = useState<'duration' | 'range'>('duration')
  const [durationInput, setDurationInput] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const monthRange = useMemo(() => getMonthDates(year, month), [year, month])

  const fetchCurrentMonth = useCallback(() => {
    fetchEntries({ start: monthRange.start, end: monthRange.end })
  }, [fetchEntries, monthRange])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    fetchCurrentMonth()
  }, [fetchCurrentMonth])

  const totalMinutes = useMemo(
    () => entries.reduce((sum, e) => sum + e.durationMin, 0),
    [entries],
  )

  const grouped = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    return groupEntriesByDate(sorted)
  }, [entries])

  async function handleAdd() {
    setFormError('')
    if (!projectId) {
      setFormError('Select a project')
      return
    }

    let durationMin: number | null = null
    let st: string | null = null
    let et: string | null = null

    if (timeMode === 'range') {
      if (!startTime || !endTime) {
        setFormError('Enter start and end time')
        return
      }
      durationMin = computeDurationFromTimes(startTime, endTime)
      if (!durationMin) {
        setFormError('End time must be after start time')
        return
      }
      st = startTime
      et = endTime
    } else {
      if (!durationInput) {
        setFormError('Enter duration')
        return
      }
      durationMin = parseHoursToMinutes(durationInput)
      if (!durationMin) {
        setFormError('Invalid duration (e.g. 1.5, 1:30, 90)')
        return
      }
    }

    const data: CreateEntryInput = {
      projectId,
      description,
      date: entryDate,
      startTime: st,
      endTime: et,
      durationMin,
      billable,
    }

    try {
      await create(data)
      checkBudget(projectId)
      setDescription('')
      setDurationInput('')
      setStartTime('')
      setEndTime('')
      fetchCurrentMonth()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add entry')
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id)
      setDeletingId(null)
    } catch {
      // ignore
    }
  }

  async function handleDrop(targetDate: string, e: React.DragEvent) {
    e.preventDefault()
    setDragOverDate(null)
    const entryId = e.dataTransfer.getData('text/plain')
    if (!entryId) return
    const entry = entries.find((en) => en.id === entryId)
    if (!entry || entry.date === targetDate) return
    await update(entryId, { date: targetDate })
    checkBudget(entry.projectId)
    fetchCurrentMonth()
  }

  return (
    <div>
      <h1 className="page-heading text-2xl font-bold text-terminal-text-bright mb-6">tracker</h1>

      {/* Input bar */}
      <div className="bg-terminal-bg-light border border-terminal-border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="What are you working on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <ProjectSelector
            value={projectId}
            onChange={setProjectId}
            projects={projects}
            className="w-48"
          />
          <Input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-36"
          />
          {timeMode === 'range' ? (
            <>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-28"
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-28"
              />
            </>
          ) : (
            <Input
              placeholder="1.5h"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-24"
            />
          )}
          <button
            type="button"
            onClick={() => setTimeMode(timeMode === 'duration' ? 'range' : 'duration')}
            className="text-xs font-mono text-terminal-text hover:text-terminal-blue transition-colors cursor-pointer px-2 py-2"
            title={timeMode === 'duration' ? 'Switch to start/end' : 'Switch to duration'}
          >
            {timeMode === 'duration' ? '[range]' : '[dur]'}
          </button>
          <button
            type="button"
            onClick={() => setBillable(!billable)}
            className={`text-xs font-mono px-2 py-2 transition-colors cursor-pointer ${billable ? 'text-terminal-green' : 'text-terminal-danger'}`}
            title={billable ? 'Billable (click to toggle)' : 'Non-billable (click to toggle)'}
          >
            {billable ? '[billable]' : '[not billable]'}
          </button>
          <Button variant="filled" onClick={handleAdd} className="px-4 py-2">
            + add
          </Button>
        </div>
        {formError && (
          <p className="text-xs text-terminal-danger mt-2 font-mono">{formError}</p>
        )}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (month === 1) { setYear((y) => y - 1); setMonth(12) }
              else setMonth((m) => m - 1)
            }}
            className="text-terminal-text hover:text-terminal-green font-mono cursor-pointer"
          >
            &lt;
          </button>
          <span className="font-mono text-sm text-terminal-text-bright min-w-[160px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={() => {
              if (month === 12) { setYear((y) => y + 1); setMonth(1) }
              else setMonth((m) => m + 1)
            }}
            className="text-terminal-text hover:text-terminal-green font-mono cursor-pointer"
          >
            &gt;
          </button>
          {(year !== now.getFullYear() || month !== now.getMonth() + 1) && (
            <button
              onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }}
              className="text-xs font-mono text-terminal-blue hover:text-terminal-blue/80 cursor-pointer ml-2"
            >
              [today]
            </button>
          )}
        </div>
        <span className="font-mono text-sm text-terminal-green">
          Total: {formatDuration(totalMinutes)}
        </span>
      </div>

      {/* Entries */}
      {loading ? (
        <p className="text-terminal-text font-mono animate-blink">loading...</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-terminal-text font-mono">No entries this month. Start tracking!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([date, dayEntries]) => {
            const dayTotal = dayEntries.reduce((sum, e) => sum + e.durationMin, 0)
            return (
              <div
                key={date}
                onDragOver={(e) => { e.preventDefault(); setDragOverDate(date) }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => handleDrop(date, e)}
                className={`rounded-lg p-2 -m-2 transition-colors ${dragOverDate === date ? 'bg-terminal-green/10 ring-1 ring-terminal-green/40 ring-dashed' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-medium text-terminal-text-bright">
                    {formatDateHeading(date)}
                  </span>
                  <span className="font-mono text-xs text-terminal-green">
                    {formatDuration(dayTotal)}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEntries.map((entry) =>
                    editingId === entry.id ? (
                      <EditRow
                        key={entry.id}
                        entry={entry}
                        projects={projects}
                        onSave={async (data) => {
                          await update(entry.id, data)
                          checkBudget(entry.projectId)
                          setEditingId(null)
                          fetchCurrentMonth()
                        }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        onEdit={() => setEditingId(entry.id)}
                        onDelete={() =>
                          deletingId === entry.id
                            ? handleDelete(entry.id)
                            : setDeletingId(entry.id)
                        }
                        onDateChange={async (newDate) => {
                          await update(entry.id, { date: newDate })
                          fetchCurrentMonth()
                        }}
                        isConfirmingDelete={deletingId === entry.id}
                        onCancelDelete={() => setDeletingId(null)}
                      />
                    ),
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EntryRow({
  entry,
  onEdit,
  onDelete,
  onDateChange,
  isConfirmingDelete,
  onCancelDelete,
}: {
  entry: EntryWithProject
  onEdit: () => void
  onDelete: () => void
  onDateChange: (date: string) => void
  isConfirmingDelete: boolean
  onCancelDelete: () => void
}) {
  const timeRange = formatTimeRange(entry.startTime, entry.endTime)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', entry.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="group flex items-center justify-between bg-terminal-bg-light rounded px-4 py-3 border border-transparent hover:border-l-2 hover:border-l-terminal-green transition-all cursor-grab active:cursor-grabbing active:opacity-50"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <span className="text-sm text-terminal-text-bright truncate max-w-xs">
          {entry.description || <span className="text-terminal-text italic">no description</span>}
        </span>
        {entry.project && (
          <ProjectBadge
            name={entry.project.name}
            color={entry.project.color}
            clientName={entry.client?.name}
          />
        )}
      </div>
      <div className="flex items-center gap-4">
        <input
          type="date"
          value={entry.date}
          onChange={(e) => { if (e.target.value && e.target.value !== entry.date) onDateChange(e.target.value) }}
          className="bg-transparent border-none text-xs font-mono text-terminal-text cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 outline-none"
          title="Change date"
        />
        {timeRange && (
          <span className="text-xs font-mono text-terminal-text">{timeRange}</span>
        )}
        <span className="text-sm font-mono text-terminal-text-bright font-medium">
          {formatDuration(entry.durationMin)}
        </span>
        {!entry.billable && (
          <span className="text-xs text-terminal-danger font-mono" title="Non-billable">
            nb
          </span>
        )}
        <div className={`flex items-center gap-1 transition-opacity ${isConfirmingDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            onClick={onEdit}
            className="text-terminal-text hover:text-terminal-blue cursor-pointer p-1"
            title="Edit"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          {isConfirmingDelete ? (
            <span className="flex items-center gap-1 text-xs font-mono">
              <button
                onClick={onDelete}
                className="text-terminal-danger hover:text-terminal-danger/80 cursor-pointer"
              >
                confirm
              </button>
              <button
                onClick={onCancelDelete}
                className="text-terminal-text hover:text-terminal-text-bright cursor-pointer"
              >
                cancel
              </button>
            </span>
          ) : (
            <button
              onClick={onDelete}
              className="text-terminal-text hover:text-terminal-danger cursor-pointer p-1"
              title="Delete"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function EditRow({
  entry,
  projects,
  onSave,
  onCancel,
}: {
  entry: EntryWithProject
  projects: Project[]
  onSave: (data: { description?: string; projectId?: string; date?: string; startTime?: string | null; endTime?: string | null; durationMin?: number; billable?: boolean }) => Promise<void>
  onCancel: () => void
}) {
  const [desc, setDesc] = useState(entry.description)
  const [proj, setProj] = useState(entry.projectId)
  const [dateVal, setDateVal] = useState(entry.date)
  const [bill, setBill] = useState(entry.billable)
  const [durInput, setDurInput] = useState(
    entry.startTime && entry.endTime ? '' : String(entry.durationMin / 60),
  )
  const [st, setSt] = useState(entry.startTime || '')
  const [et, setEt] = useState(entry.endTime || '')
  const [mode, setMode] = useState<'duration' | 'range'>(
    entry.startTime && entry.endTime ? 'range' : 'duration',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    let durationMin: number
    let startTime: string | null = null
    let endTime: string | null = null

    if (mode === 'range') {
      if (!st || !et) {
        setError('Enter start and end time')
        return
      }
      const computed = computeDurationFromTimes(st, et)
      if (!computed) {
        setError('End must be after start')
        return
      }
      durationMin = computed
      startTime = st
      endTime = et
    } else {
      const parsed = parseHoursToMinutes(durInput)
      if (!parsed) {
        setError('Invalid duration')
        return
      }
      durationMin = parsed
    }

    setSaving(true)
    try {
      await onSave({
        description: desc,
        projectId: proj,
        date: dateVal,
        startTime,
        endTime,
        durationMin,
        billable: bill,
      })
    } catch {
      setError('Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="bg-terminal-bg-light rounded px-4 py-3 border border-terminal-blue/30">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[150px]">
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>
        <ProjectSelector
          value={proj}
          onChange={setProj}
          projects={projects}
          className="w-40"
        />
        <Input
          type="date"
          value={dateVal}
          onChange={(e) => setDateVal(e.target.value)}
          className="w-36"
        />
        {mode === 'range' ? (
          <>
            <Input type="time" value={st} onChange={(e) => setSt(e.target.value)} className="w-28" />
            <Input type="time" value={et} onChange={(e) => setEt(e.target.value)} className="w-28" />
          </>
        ) : (
          <Input
            value={durInput}
            onChange={(e) => setDurInput(e.target.value)}
            placeholder="1.5h"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-24"
          />
        )}
        <button
          type="button"
          onClick={() => setMode(mode === 'duration' ? 'range' : 'duration')}
          className="text-xs font-mono text-terminal-text hover:text-terminal-blue cursor-pointer px-1"
        >
          {mode === 'duration' ? '[range]' : '[dur]'}
        </button>
        <button
          type="button"
          onClick={() => setBill(!bill)}
          className={`text-xs font-mono px-2 py-1.5 transition-colors cursor-pointer ${bill ? 'text-terminal-green' : 'text-terminal-danger'}`}
          title={bill ? 'Billable (click to toggle)' : 'Non-billable (click to toggle)'}
        >
          {bill ? '[billable]' : '[not billable]'}
        </button>
        <Button variant="filled" onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-xs">
          save
        </Button>
        <Button variant="outline" onClick={onCancel} className="px-3 py-1.5 text-xs">
          cancel
        </Button>
      </div>
      {error && <p className="text-xs text-terminal-danger mt-2 font-mono">{error}</p>}
    </div>
  )
}
