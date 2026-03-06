import { useState, useEffect, useCallback, useRef, type KeyboardEvent } from 'react'
import { useEntries } from '../hooks/useEntries'
import { useProjects } from '../hooks/useProjects'
import { getWeekDates, parseHoursToMinutes, formatDecimalHours } from '../lib/time'
import { Button } from '../components/ui/Button'
import { ProjectSelector } from '../components/ProjectSelector'
import type { EntryWithProject } from '../types'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface GridRow {
  projectId: string
  projectName: string
  projectColor: string
  clientName: string | null
  cells: (number | null)[] // durationMin per day, null = empty
  entryIds: (string[] | null)[] // entry IDs per day for update/delete
}

function formatWeekHeader(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' })
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' })
  const year = e.getFullYear()
  if (sMonth === eMonth) {
    return `Week of ${sMonth} ${s.getDate()} \u2013 ${e.getDate()}, ${year}`
  }
  return `Week of ${sMonth} ${s.getDate()} \u2013 ${eMonth} ${e.getDate()}, ${year}`
}

function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function buildGrid(entries: EntryWithProject[], projectIds: string[], projects: { id: string; name: string; color: string; clientName: string | null }[], dates: string[]): GridRow[] {
  return projectIds.map((pid) => {
    const proj = projects.find((p) => p.id === pid)
    const cells: (number | null)[] = []
    const entryIds: (string[] | null)[] = []

    for (const date of dates) {
      const matching = entries.filter((e) => e.projectId === pid && e.date === date)
      if (matching.length > 0) {
        const total = matching.reduce((sum, e) => sum + e.durationMin, 0)
        cells.push(total)
        entryIds.push(matching.map((e) => e.id))
      } else {
        cells.push(null)
        entryIds.push(null)
      }
    }

    return {
      projectId: pid,
      projectName: proj?.name ?? 'Unknown',
      projectColor: proj?.color ?? '#888',
      clientName: proj?.clientName ?? null,
      cells,
      entryIds,
    }
  })
}

export function Timesheet() {
  const [refDate, setRefDate] = useState(() => new Date())
  const [gridRows, setGridRows] = useState<GridRow[]>([])
  const [addingRow, setAddingRow] = useState(false)
  const [newProjectId, setNewProjectId] = useState('')
  const { entries, loading, fetch: fetchEntries, create, update, remove } = useEntries()
  const { projects, fetch: fetchProjects } = useProjects()
  const savingRef = useRef(false)

  const week = getWeekDates(refDate)
  const { start, end, dates } = week

  // Build project lookup with client names
  const projectLookup = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    clientName: null as string | null,
  }))

  // Merge client names from entries
  for (const e of entries) {
    if (e.client) {
      const p = projectLookup.find((pl) => pl.id === e.projectId)
      if (p && !p.clientName) p.clientName = e.client.name
    }
  }

  // Fetch on mount and week changes
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    fetchEntries({ start, end })
  }, [fetchEntries, start, end])

  // Rebuild grid when entries or projects change (but not during saves)
  useEffect(() => {
    if (savingRef.current) return
    const existingProjectIds = [...new Set(entries.map((e) => e.projectId))]
    // Preserve manually added rows
    const manualIds = gridRows
      .map((r) => r.projectId)
      .filter((id) => !existingProjectIds.includes(id))
    const allIds = [...existingProjectIds, ...manualIds]
    setGridRows(buildGrid(entries, allIds, projectLookup, dates))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, projects, start])

  const prevWeek = () => {
    setRefDate((d) => {
      const n = new Date(d)
      n.setDate(n.getDate() - 7)
      return n
    })
  }

  const nextWeek = () => {
    setRefDate((d) => {
      const n = new Date(d)
      n.setDate(n.getDate() + 7)
      return n
    })
  }

  const goToday = () => setRefDate(new Date())

  const handleCellSave = useCallback(
    async (rowIndex: number, dayIndex: number, inputValue: string) => {
      const row = gridRows[rowIndex]
      if (!row) return

      const trimmed = inputValue.trim()
      const existingIds = row.entryIds[dayIndex]
      const hasEntry = existingIds && existingIds.length > 0

      savingRef.current = true

      try {
        if (trimmed === '' || trimmed === '0') {
          // Delete entries
          if (hasEntry) {
            for (const id of existingIds) {
              await remove(id)
            }
            setGridRows((prev) =>
              prev.map((r, ri) =>
                ri === rowIndex
                  ? { ...r, cells: r.cells.map((c, ci) => (ci === dayIndex ? null : c)), entryIds: r.entryIds.map((e, ci) => (ci === dayIndex ? null : e)) }
                  : r
              )
            )
          }
          return
        }

        const minutes = parseHoursToMinutes(trimmed)
        if (minutes === null) return // invalid input, do nothing

        const date = dates[dayIndex]

        if (hasEntry) {
          // Update: keep first entry with new total, delete rest
          const [keepId, ...deleteIds] = existingIds
          for (const id of deleteIds) {
            await remove(id)
          }
          await update(keepId, { durationMin: minutes })
          setGridRows((prev) =>
            prev.map((r, ri) =>
              ri === rowIndex
                ? { ...r, cells: r.cells.map((c, ci) => (ci === dayIndex ? minutes : c)), entryIds: r.entryIds.map((e, ci) => (ci === dayIndex ? [keepId] : e)) }
                : r
            )
          )
        } else {
          // Create new entry
          await create({
            projectId: row.projectId,
            date,
            durationMin: minutes,
            description: '',
            billable: true,
          })
          // Re-fetch to get the new entry ID
          await fetchEntries({ start, end })
        }
      } finally {
        savingRef.current = false
      }
    },
    [gridRows, dates, remove, update, create, fetchEntries, start, end]
  )

  const handleAddRow = () => {
    if (!newProjectId) return
    const proj = projectLookup.find((p) => p.id === newProjectId)
    if (!proj) return

    setGridRows((prev) => [
      ...prev,
      {
        projectId: newProjectId,
        projectName: proj.name,
        projectColor: proj.color,
        clientName: proj.clientName,
        cells: Array(7).fill(null),
        entryIds: Array(7).fill(null),
      },
    ])
    setNewProjectId('')
    setAddingRow(false)
  }

  // Projects not already in the grid
  const availableProjects = projects.filter(
    (p) => !gridRows.some((r) => r.projectId === p.id)
  )

  // Compute column totals
  const columnTotals = dates.map((_, di) =>
    gridRows.reduce<number>((sum, row) => sum + (row.cells[di] ?? 0), 0)
  )
  const grandTotal = columnTotals.reduce((a, b) => a + b, 0)

  return (
    <div>
      <h1 className="page-heading text-2xl font-bold text-terminal-text-bright mb-6 font-mono">
        timesheet
      </h1>

      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="outline" onClick={prevWeek} className="px-2 py-1 text-xs">
          &#9664;
        </Button>
        <span className="text-terminal-text-bright font-mono text-sm">
          {formatWeekHeader(start, end)}
        </span>
        <Button variant="outline" onClick={nextWeek} className="px-2 py-1 text-xs">
          &#9654;
        </Button>
        <Button variant="outline" onClick={goToday} className="px-2 py-1 text-xs ml-2">
          today
        </Button>
      </div>

      {loading && gridRows.length === 0 ? (
        <p className="text-terminal-text font-mono text-sm">Loading...</p>
      ) : (
        <>
          {/* Grid table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-terminal-border font-mono text-sm">
              {/* Header */}
              <thead>
                <tr className="bg-terminal-surface">
                  <th className="border border-terminal-border px-3 py-2 text-left text-terminal-text-bright font-bold w-48">
                    Project
                  </th>
                  {dates.map((date, i) => (
                    <th
                      key={date}
                      className={`border border-terminal-border px-2 py-2 text-center text-terminal-text-bright font-bold w-20 ${i >= 5 ? 'opacity-60' : ''}`}
                    >
                      <div>{DAY_LABELS[i]}</div>
                      <div className="text-xs font-normal text-terminal-text">{formatDayDate(date)}</div>
                    </th>
                  ))}
                  <th className="border border-terminal-border px-3 py-2 text-center text-terminal-text-bright font-bold w-20">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {gridRows.map((row, rowIndex) => {
                  const rowTotal = row.cells.reduce<number>((sum, c) => sum + (c ?? 0), 0)
                  return (
                    <tr key={row.projectId} className="bg-terminal-bg-light">
                      <td className="border border-terminal-border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: row.projectColor }}
                          />
                          <span className="text-terminal-text-bright text-sm truncate">
                            {row.projectName}
                          </span>
                          {row.clientName && (
                            <span className="text-xs text-terminal-text">({row.clientName})</span>
                          )}
                        </div>
                      </td>
                      {row.cells.map((cellMin, dayIndex) => (
                        <CellInput
                          key={`${row.projectId}-${dates[dayIndex]}`}
                          value={cellMin}
                          isWeekend={dayIndex >= 5}
                          onSave={(val) => handleCellSave(rowIndex, dayIndex, val)}
                        />
                      ))}
                      <td className="border border-terminal-border px-2 py-2 text-center text-terminal-text-bright font-bold">
                        {rowTotal > 0 ? formatDecimalHours(rowTotal) : ''}
                      </td>
                    </tr>
                  )
                })}

                {/* Totals row */}
                <tr className="border-t-2 border-terminal-border bg-terminal-surface">
                  <td className="border border-terminal-border px-3 py-2 text-terminal-text-bright font-bold">
                    Total
                  </td>
                  {columnTotals.map((total, i) => (
                    <td
                      key={i}
                      className={`border border-terminal-border px-2 py-2 text-center font-bold ${i >= 5 ? 'opacity-60' : ''} ${total > 0 ? 'text-terminal-text-bright' : 'text-terminal-text'}`}
                    >
                      {i >= 5 && total === 0 ? '\u2014' : total > 0 ? formatDecimalHours(total) : ''}
                    </td>
                  ))}
                  <td className="border border-terminal-border px-2 py-2 text-center font-bold text-terminal-green">
                    {grandTotal > 0 ? formatDecimalHours(grandTotal) : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Add row */}
          <div className="mt-4">
            {addingRow ? (
              <div className="flex items-center gap-3">
                <ProjectSelector
                  value={newProjectId}
                  onChange={setNewProjectId}
                  projects={availableProjects}
                  className="w-64"
                />
                <Button variant="filled" onClick={handleAddRow} disabled={!newProjectId} className="text-xs px-3 py-1">
                  add
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddingRow(false)
                    setNewProjectId('')
                  }}
                  className="text-xs px-3 py-1"
                >
                  cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setAddingRow(true)} className="text-xs">
                + add row
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

interface CellInputProps {
  value: number | null
  isWeekend: boolean
  onSave: (value: string) => void
}

function CellInput({ value, isWeekend, onSave }: CellInputProps) {
  const displayValue = value != null && value > 0 ? formatDecimalHours(value) : ''
  const [inputValue, setInputValue] = useState(displayValue)
  const [focused, setFocused] = useState(false)
  const dirtyRef = useRef(false)

  // Sync with external value when not focused
  useEffect(() => {
    if (!focused) {
      setInputValue(displayValue)
    }
  }, [displayValue, focused])

  const handleBlur = () => {
    setFocused(false)
    if (dirtyRef.current) {
      dirtyRef.current = false
      onSave(inputValue)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      dirtyRef.current = false
      setInputValue(displayValue)
      e.currentTarget.blur()
    }
  }

  return (
    <td
      className={`border border-terminal-border p-0 ${isWeekend ? 'opacity-60' : ''}`}
    >
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          dirtyRef.current = true
        }}
        onFocus={(e) => {
          setFocused(true)
          e.target.select()
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full bg-transparent text-center text-terminal-text-bright font-mono text-sm px-2 py-2 outline-none focus:bg-terminal-surface focus:ring-1 focus:ring-terminal-green focus:shadow-[0_0_6px_rgba(57,255,20,0.3)]"
        inputMode="decimal"
      />
    </td>
  )
}
