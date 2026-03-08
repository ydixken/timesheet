import { useState, useMemo } from 'react'
import type { Project, CreateEntryInput } from '@timesheet/shared'
import type { EntryWithProject } from '../../types'
import { formatDecimalHours, parseHoursToMinutes, groupEntriesByDate } from '../../lib/time'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ProjectBadge } from '../ProjectBadge'
import { ProjectSelector } from '../ProjectSelector'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getCalendarDays(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = (firstDay.getDay() + 6) % 7 // Monday = 0

  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = new Array(startDayOfWeek).fill(null)

  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }
  return weeks
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

interface DayData {
  totalMin: number
  entries: EntryWithProject[]
  projectSegments: { color: string; fraction: number }[]
}

interface MonthViewProps {
  currentYear: number
  currentMonth: number
  entries: EntryWithProject[]
  loading: boolean
  projects: Project[]
  onCreateEntry: (data: CreateEntryInput) => Promise<void>
  onRefreshEntries: () => Promise<void>
}

export function MonthView({
  currentYear,
  currentMonth,
  entries,
  loading,
  projects,
  onCreateEntry,
  onRefreshEntries,
}: MonthViewProps) {
  const today = new Date()

  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [addingEntry, setAddingEntry] = useState(false)
  const [newProjectId, setNewProjectId] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDuration, setNewDuration] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')

  const weeks = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth])

  const entriesByDate = useMemo(() => groupEntriesByDate(entries), [entries])

  const dayDataMap = useMemo(() => {
    const map = new Map<number, DayData>()
    for (let day = 1; day <= new Date(currentYear, currentMonth + 1, 0).getDate(); day++) {
      const dateStr = toDateStr(currentYear, currentMonth, day)
      const dayEntries = entriesByDate.get(dateStr) || []
      const totalMin = dayEntries.reduce((sum, e) => sum + e.durationMin, 0)

      // Build project color segments
      const projectTotals = new Map<string, { color: string; min: number }>()
      for (const e of dayEntries) {
        const color = e.project?.color ?? '#888'
        const key = e.projectId ?? 'none'
        const existing = projectTotals.get(key)
        if (existing) {
          existing.min += e.durationMin
        } else {
          projectTotals.set(key, { color, min: e.durationMin })
        }
      }
      const projectSegments = totalMin > 0
        ? [...projectTotals.values()].map((p) => ({
            color: p.color,
            fraction: p.min / totalMin,
          }))
        : []

      map.set(day, { totalMin, entries: dayEntries, projectSegments })
    }
    return map
  }, [entriesByDate, currentYear, currentMonth])

  const isTodayCell = (day: number) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear()

  const selectedDayData = selectedDay ? dayDataMap.get(selectedDay) : null
  const selectedDateStr = selectedDay
    ? new Date(currentYear, currentMonth, selectedDay).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const handleAddEntry = async () => {
    if (!newProjectId || !newDuration) return
    const minutes = parseHoursToMinutes(newDuration)
    if (minutes === null || !selectedDay) return

    await onCreateEntry({
      projectId: newProjectId,
      date: toDateStr(currentYear, currentMonth, selectedDay),
      durationMin: minutes,
      description: newDescription,
      startTime: newStartTime || null,
      endTime: newEndTime || null,
      billable: true,
    })
    await onRefreshEntries()

    setNewProjectId('')
    setNewDescription('')
    setNewDuration('')
    setNewStartTime('')
    setNewEndTime('')
    setAddingEntry(false)
  }

  return (
    <>
      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-terminal-border font-mono text-sm table-fixed">
          <thead>
            <tr className="bg-terminal-surface">
              {DAY_LABELS.map((label, i) => (
                <th
                  key={label}
                  className={`border border-terminal-border px-2 py-2 text-center text-terminal-text-bright font-bold ${i >= 5 ? 'opacity-60' : ''}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((day, di) => {
                  if (day === null) {
                    return (
                      <td
                        key={di}
                        className="border border-terminal-border bg-terminal-bg min-h-24 h-24 p-2 align-top"
                      />
                    )
                  }
                  const data = dayDataMap.get(day)
                  const isWeekend = di >= 5
                  const isToday = isTodayCell(day)
                  const isSelected = selectedDay === day

                  return (
                    <td
                      key={di}
                      onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                      className={`border min-h-24 h-24 p-2 align-top cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-terminal-green bg-terminal-green/5'
                          : isToday
                            ? 'border-terminal-green bg-terminal-bg-light'
                            : 'border-terminal-border bg-terminal-bg-light hover:bg-terminal-hover'
                      } ${isWeekend ? 'opacity-60' : ''}`}
                    >
                      <div className="flex flex-col h-full">
                        {/* Day number */}
                        <div className="flex justify-end">
                          <span
                            className={`text-xs ${
                              isToday
                                ? 'text-terminal-green font-bold'
                                : 'text-terminal-text'
                            }`}
                          >
                            {day}
                          </span>
                        </div>

                        {/* Hours */}
                        {data && data.totalMin > 0 && (
                          <div className="flex-1 flex flex-col justify-center">
                            <span className="text-sm font-bold text-terminal-text-bright text-center">
                              {formatDecimalHours(data.totalMin)}h
                            </span>
                          </div>
                        )}

                        {/* Project color bars */}
                        {data && data.projectSegments.length > 0 && (
                          <div className="flex gap-px mt-auto">
                            {data.projectSegments.map((seg, si) => (
                              <div
                                key={si}
                                className="h-1 rounded-full"
                                style={{
                                  backgroundColor: seg.color,
                                  flex: seg.fraction,
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Day detail panel */}
      {selectedDay !== null && (
        <div className="mt-4 bg-terminal-bg-light border border-terminal-border rounded p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-terminal-text-bright font-mono text-sm font-bold">
              {selectedDateStr}
            </h2>
            <span className="text-terminal-text font-mono text-sm">
              Total:{' '}
              <span className="text-terminal-text-bright font-bold">
                {selectedDayData && selectedDayData.totalMin > 0
                  ? `${formatDecimalHours(selectedDayData.totalMin)}h`
                  : '0h'}
              </span>
            </span>
          </div>

          {/* Entry list */}
          {selectedDayData && selectedDayData.entries.length > 0 ? (
            <div className="space-y-2 mb-4">
              {selectedDayData.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 py-2 px-3 bg-terminal-bg rounded border border-terminal-border"
                >
                  <ProjectBadge
                    name={entry.project?.name ?? 'Unknown'}
                    color={entry.project?.color ?? '#888'}
                    clientName={entry.client?.name}
                  />
                  <span className="text-sm text-terminal-text flex-1 truncate">
                    {entry.description || '\u2014'}
                  </span>
                  <span className="text-xs text-terminal-text font-mono shrink-0">
                    {entry.startTime && entry.endTime
                      ? `${entry.startTime} \u2013 ${entry.endTime}`
                      : '\u2014'}
                  </span>
                  <span className="text-sm text-terminal-text-bright font-bold font-mono shrink-0">
                    {formatDecimalHours(entry.durationMin)}h
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-terminal-text text-sm mb-4 font-mono">No entries for this day.</p>
          )}

          {/* Add entry */}
          {addingEntry ? (
            <div className="space-y-3 border border-terminal-border rounded p-3 bg-terminal-bg">
              <div className="grid grid-cols-2 gap-3">
                <ProjectSelector
                  value={newProjectId}
                  onChange={setNewProjectId}
                  projects={projects}
                  className="col-span-2"
                />
                <Input
                  placeholder="Description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="col-span-2"
                />
                <Input
                  placeholder="Duration (e.g. 6.5)"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Start (HH:MM)"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                  />
                  <Input
                    placeholder="End (HH:MM)"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="filled"
                  onClick={handleAddEntry}
                  disabled={!newProjectId || !newDuration}
                  className="text-xs px-3 py-1"
                >
                  save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddingEntry(false)
                    setNewProjectId('')
                    setNewDescription('')
                    setNewDuration('')
                    setNewStartTime('')
                    setNewEndTime('')
                  }}
                  className="text-xs px-3 py-1"
                >
                  cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setAddingEntry(true)}
              className="text-xs"
            >
              + add entry
            </Button>
          )}
        </div>
      )}
    </>
  )
}
