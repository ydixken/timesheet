import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import type { CreateEntryInput, Project } from '@timesheet/shared'
import type { EntryWithProject } from '../types'
import { useEntries } from '../hooks/useEntries'
import { useProjects } from '../hooks/useProjects'
import { DescriptionAutocomplete } from '../components/DescriptionAutocomplete'
import { InlineEditableText } from '../components/InlineEditableText'
import { ProjectBadge } from '../components/ProjectBadge'
import { ProjectSelector } from '../components/ProjectSelector'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { toast } from '../store/toasts'
import {
  formatDuration,
  formatLocalDate,
  formatTimeRange,
  parseHoursToMinutes,
  getMonthDates,
  formatDateHeading,
  groupEntriesByDate,
} from '../lib/time'
import { useBudgetAlerts } from '../hooks/useBudgetAlerts'

function todayStr(): string {
  return formatLocalDate(new Date())
}

function computeDurationFromTimes(start: string, end: string): number | null {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  return mins > 0 ? mins : null
}

// Shared by the desktop "change date" icon and the mobile kebab. The hidden
// date input must stay rendered (showPicker() requires a rendered element).
function openDatePicker(entryId: string) {
  const input = document.getElementById(`date-${entryId}`) as HTMLInputElement | null
  input?.showPicker()
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
  const descInputWrapRef = useRef<HTMLDivElement>(null)

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
      toast({ variant: 'success', message: 'entry added' })
    } catch {
      // create() already surfaces a danger toast via the store; keep inline
      // errors reserved for validation so failures aren't double-surfaced.
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

      {/* Quick-add */}
      <Card className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
          <div ref={descInputWrapRef} className="w-full sm:flex-1 sm:min-w-[200px]">
            <DescriptionAutocomplete
              value={description}
              onChange={setDescription}
              entries={entries}
              onSubmit={handleAdd}
              onProjectSelect={setProjectId}
              placeholder="What are you working on?"
            />
          </div>
          <ProjectSelector
            value={projectId}
            onChange={setProjectId}
            projects={projects}
            className="w-full sm:w-48"
          />
          <Input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full sm:w-36"
          />
          {timeMode === 'range' ? (
            <>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full sm:w-28"
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full sm:w-28"
              />
            </>
          ) : (
            <Input
              placeholder="1.5h"
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-full sm:w-24"
            />
          )}
          {/* Toggles share one row on mobile, flow inline on desktop (sm:contents) */}
          <div className="flex gap-2 w-full sm:contents">
            <button
              type="button"
              aria-pressed={timeMode === 'range'}
              onClick={() => setTimeMode(timeMode === 'duration' ? 'range' : 'duration')}
              className="tap-target flex-1 sm:flex-none rounded px-2 py-2 text-xs font-mono text-terminal-text hover:text-terminal-blue transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
              title={timeMode === 'duration' ? 'Switch to start/end' : 'Switch to duration'}
            >
              {timeMode === 'duration' ? '[range]' : '[dur]'}
            </button>
            <button
              type="button"
              aria-pressed={billable}
              onClick={() => setBillable(!billable)}
              className={`tap-target flex-1 sm:flex-none rounded px-2 py-2 text-xs font-mono transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60 ${billable ? 'text-terminal-green' : 'text-terminal-danger'}`}
              title={billable ? 'Billable (click to toggle)' : 'Non-billable (click to toggle)'}
            >
              {billable ? '[billable]' : '[not billable]'}
            </button>
          </div>
          <Button variant="filled" onClick={handleAdd} className="tap-target w-full sm:w-auto px-4 py-2">
            + add
          </Button>
        </div>
        {formError && (
          <p className="text-xs text-terminal-danger mt-2 font-mono">{formError}</p>
        )}
      </Card>

      {/* Month nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (month === 1) { setYear((y) => y - 1); setMonth(12) }
              else setMonth((m) => m - 1)
            }}
            className="tap-target inline-flex items-center justify-center rounded p-1.5 text-terminal-text-muted hover:text-terminal-green hover:bg-terminal-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
            aria-label="Previous month"
          >
            <Icon name="chevron-right" className="rotate-180" />
          </button>
          <span className="font-mono text-sm text-terminal-text-bright min-w-[160px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            type="button"
            onClick={() => {
              if (month === 12) { setYear((y) => y + 1); setMonth(1) }
              else setMonth((m) => m + 1)
            }}
            className="tap-target inline-flex items-center justify-center rounded p-1.5 text-terminal-text-muted hover:text-terminal-green hover:bg-terminal-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
            aria-label="Next month"
          >
            <Icon name="chevron-right" />
          </button>
          {(year !== now.getFullYear() || month !== now.getMonth() + 1) && (
            <button
              type="button"
              onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1) }}
              className="tap-target rounded px-2 py-1 text-xs font-mono text-terminal-blue hover:text-terminal-blue/80 cursor-pointer ml-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
            >
              [today]
            </button>
          )}
        </div>
        <span className="font-data text-sm text-terminal-green">
          Total: {formatDuration(totalMinutes)}
        </span>
      </div>

      {/* Entries */}
      {loading ? (
        <TrackerSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState
          prompt="no entries this month"
          message="Log your first entry above to start tracking time for this month."
          action={{
            label: '+ add entry',
            onClick: () => descInputWrapRef.current?.querySelector('input')?.focus(),
          }}
        />
      ) : (
        <div className="space-y-6 touch-safe animate-fade-in" onContextMenu={(e) => e.preventDefault()}>
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
                        onDescriptionUpdate={async (newDesc) => {
                          await update(entry.id, { description: newDesc })
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
  onDescriptionUpdate,
  isConfirmingDelete,
  onCancelDelete,
}: {
  entry: EntryWithProject
  onEdit: () => void
  onDelete: () => void
  onDateChange: (date: string) => void
  onDescriptionUpdate: (desc: string) => Promise<void>
  isConfirmingDelete: boolean
  onCancelDelete: () => void
}) {
  const timeRange = formatTimeRange(entry.startTime, entry.endTime)
  const gripRef = useRef<HTMLDivElement>(null)
  const [dragAllowed, setDragAllowed] = useState(false)

  return (
    <div
      draggable={dragAllowed}
      onDragStart={(e) => {
        if (!dragAllowed) { e.preventDefault(); return }
        e.dataTransfer.setData('text/plain', entry.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragEnd={() => setDragAllowed(false)}
      className={`touch-safe group flex flex-col gap-1.5 rounded px-4 py-3 border border-transparent transition-all hover:border-l-2 hover:border-l-terminal-green sm:grid sm:items-center sm:gap-x-3 sm:grid-cols-[auto_1fr_minmax(0,20rem)_auto] ${entry.billable ? 'bg-terminal-bg-light' : 'bg-terminal-bg-light/50 opacity-70'}`}
    >
      {/* Drag grip — pointer/desktop only; it conflicts with touch-scroll */}
      <div
        ref={gripRef}
        onMouseDown={() => setDragAllowed(true)}
        className="hidden md:block cursor-grab active:cursor-grabbing text-terminal-border group-hover:text-terminal-text transition-colors"
        title="Drag to move"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="8" cy="2" r="1.5" />
          <circle cx="2" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="2" cy="14" r="1.5" />
          <circle cx="8" cy="14" r="1.5" />
        </svg>
      </div>
      {/* Description — human prose (Inter) */}
      <div className="min-w-0">
        <InlineEditableText
          value={entry.description}
          onSave={onDescriptionUpdate}
          placeholder="no description"
          className="font-prose"
        />
      </div>
      {/* Meta — one row on mobile (badge + duration + kebab); separate grid cells on sm+ */}
      <div className="flex items-center justify-between gap-3 sm:contents">
        <div className="min-w-0 whitespace-nowrap truncate sm:border-l sm:border-terminal-border sm:pl-3">
          {entry.project && (
            <ProjectBadge
              name={entry.project.name}
              color={entry.project.color}
              clientName={entry.client?.name}
            />
          )}
        </div>
        <div className="relative flex items-center justify-end gap-3 sm:border-l sm:border-terminal-border sm:pl-3">
          <span className="hidden sm:inline-block text-xs font-data text-terminal-text-muted whitespace-nowrap w-[13ch] text-right">
            {timeRange || ''}
          </span>
          <span className="sm:border-l sm:border-terminal-border sm:pl-3 text-sm font-data text-terminal-text-bright font-medium whitespace-nowrap w-[6ch] text-right">
            {formatDuration(entry.durationMin)}
          </span>
          {/* Hidden date input — driven by both the desktop icon and the mobile
              kebab; must stay rendered (showPicker needs a rendered element) */}
          <input
            id={`date-${entry.id}`}
            type="date"
            value={entry.date}
            onChange={(e) => { if (e.target.value && e.target.value !== entry.date) onDateChange(e.target.value) }}
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            tabIndex={-1}
            aria-hidden="true"
          />
          {/* Desktop hover actions (≥md) */}
          <div className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 items-center gap-1 bg-terminal-bg-light pl-2 transition-opacity ${isConfirmingDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <button
              type="button"
              onClick={() => openDatePicker(entry.id)}
              className="text-terminal-text hover:text-terminal-blue cursor-pointer p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
              title="Change date"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
            <button
              onClick={onEdit}
              className="text-terminal-text hover:text-terminal-blue cursor-pointer p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
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
                  className="text-terminal-danger hover:text-terminal-danger/80 cursor-pointer rounded px-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                >
                  confirm
                </button>
                <button
                  onClick={onCancelDelete}
                  className="text-terminal-text hover:text-terminal-text-bright cursor-pointer rounded px-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                >
                  cancel
                </button>
              </span>
            ) : (
              <button
                onClick={onDelete}
                className="text-terminal-text hover:text-terminal-danger cursor-pointer p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                title="Delete"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
          {/* Mobile/tablet kebab (<md) — reaches the same actions on touch */}
          <RowActionsMenu
            entryId={entry.id}
            onEdit={onEdit}
            onDelete={onDelete}
            isConfirmingDelete={isConfirmingDelete}
            onCancelDelete={onCancelDelete}
          />
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
  const [st, setSt] = useState(entry.startTime?.slice(0, 5) || '')
  const [et, setEt] = useState(entry.endTime?.slice(0, 5) || '')
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
      // onSave() already surfaces a danger toast via the store; just re-enable
      // the form. Inline errors stay reserved for validation feedback.
      setSaving(false)
    }
  }

  return (
    <Card accent>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
        <div className="w-full sm:flex-1 sm:min-w-[150px]">
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
          className="w-full sm:w-40"
        />
        <Input
          type="date"
          value={dateVal}
          onChange={(e) => setDateVal(e.target.value)}
          className="w-full sm:w-36"
        />
        {mode === 'range' ? (
          <>
            <Input type="time" value={st} onChange={(e) => setSt(e.target.value)} className="w-full sm:w-28" />
            <Input type="time" value={et} onChange={(e) => setEt(e.target.value)} className="w-full sm:w-28" />
          </>
        ) : (
          <Input
            value={durInput}
            onChange={(e) => setDurInput(e.target.value)}
            placeholder="1.5h"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full sm:w-24"
          />
        )}
        {/* Toggles share one row on mobile, flow inline on desktop (sm:contents) */}
        <div className="flex gap-2 w-full sm:contents">
          <button
            type="button"
            aria-pressed={mode === 'range'}
            onClick={() => setMode(mode === 'duration' ? 'range' : 'duration')}
            className="tap-target flex-1 sm:flex-none rounded px-2 py-1.5 text-xs font-mono text-terminal-text hover:text-terminal-blue cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
          >
            {mode === 'duration' ? '[range]' : '[dur]'}
          </button>
          <button
            type="button"
            aria-pressed={bill}
            onClick={() => setBill(!bill)}
            className={`tap-target flex-1 sm:flex-none rounded px-2 py-1.5 text-xs font-mono transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60 ${bill ? 'text-terminal-green' : 'text-terminal-danger'}`}
            title={bill ? 'Billable (click to toggle)' : 'Non-billable (click to toggle)'}
          >
            {bill ? '[billable]' : '[not billable]'}
          </button>
        </div>
        <div className="flex gap-2 w-full sm:contents">
          <Button variant="filled" onClick={handleSave} disabled={saving} className="tap-target flex-1 sm:flex-none px-3 py-1.5 text-xs">
            save
          </Button>
          <Button variant="outline" onClick={onCancel} className="tap-target flex-1 sm:flex-none px-3 py-1.5 text-xs">
            cancel
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-terminal-danger mt-2 font-mono">{error}</p>}
    </Card>
  )
}

// Touch fallback for the hover-only row actions (<md). Reaches the same
// change-date / edit / delete handlers; delete uses the same two-tap confirm
// as the desktop icons (first tap arms it, second tap commits).
function RowActionsMenu({
  entryId,
  onEdit,
  onDelete,
  isConfirmingDelete,
  onCancelDelete,
}: {
  entryId: string
  onEdit: () => void
  onDelete: () => void
  isConfirmingDelete: boolean
  onCancelDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const itemClass =
    'block w-full text-left px-3 py-2 text-sm font-mono text-terminal-text transition-colors cursor-pointer hover:bg-terminal-hover hover:text-terminal-text-bright focus-visible:outline-none focus-visible:bg-terminal-hover'

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label="Entry actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="tap-target inline-flex items-center justify-center rounded px-2 text-terminal-text-muted hover:text-terminal-text-bright transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open && (
        <>
          {/* tap-away backdrop */}
          <div className="fixed inset-0 z-20" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-terminal-border bg-terminal-elevated shadow-elevated py-1"
          >
            {isConfirmingDelete ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { onDelete(); setOpen(false) }}
                  className={`${itemClass} text-terminal-danger hover:text-terminal-danger`}
                >
                  confirm delete
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { onCancelDelete(); setOpen(false) }}
                  className={itemClass}
                >
                  cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); openDatePicker(entryId) }}
                  className={itemClass}
                >
                  change date
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { onEdit(); setOpen(false) }}
                  className={itemClass}
                >
                  edit
                </button>
                {/* First tap arms confirm; menu stays open and re-renders into the confirm branch */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => onDelete()}
                  className={`${itemClass} text-terminal-danger hover:text-terminal-danger`}
                >
                  delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Loading state — shape-matched to the day-grouped list (heading bar + rows).
function TrackerSkeleton() {
  const groups = [4, 3, 2]
  return (
    <div className="space-y-6" role="status" aria-label="Loading entries">
      {groups.map((rows, gi) => (
        <div key={gi}>
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="space-y-1">
            {Array.from({ length: rows }).map((_, ri) => (
              <Skeleton key={ri} className="h-[46px] w-full rounded" />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading entries</span>
    </div>
  )
}
