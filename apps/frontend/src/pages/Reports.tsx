import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { api } from '../api/client'
import { useProjects } from '../hooks/useProjects'
import { Button } from '../components/ui/Button'
import { formatDecimalHours } from '../lib/time'

interface SummaryGroup {
  id: string
  name: string
  color: string
  totalMinutes: number
  billableMinutes: number
  entries: number
}

interface SummaryResponse {
  groups: SummaryGroup[]
  totalMinutes: number
  billableMinutes: number
}

interface DetailedEntry {
  id: string
  description: string
  date: string
  startTime: string | null
  endTime: string | null
  durationMin: number
  billable: boolean
  projectName: string
  projectColor: string
  clientName: string | null
}

interface DetailedResponse {
  entries: DetailedEntry[]
  totalMinutes: number
}

type Tab = 'summary' | 'detailed'
type GroupBy = 'project' | 'client'
type SortKey = 'date' | 'projectName' | 'description' | 'durationMin' | 'billable'
type SortDir = 'asc' | 'desc'

function defaultStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function defaultEnd(): string {
  return new Date().toISOString().split('T')[0]
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start || !end) return '\u2014'
  const fmt = (t: string) => t.slice(0, 5)
  return `${fmt(start)}\u2013${fmt(end)}`
}

export function Reports() {
  const [tab, setTab] = useState<Tab>('summary')
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [groupBy, setGroupBy] = useState<GroupBy>('project')
  const [projectFilter, setProjectFilter] = useState('')

  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [detailed, setDetailed] = useState<DetailedResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { projects, fetch: fetchProjects } = useProjects()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<SummaryResponse>(
        `/reports/summary?start=${startDate}&end=${endDate}&groupBy=${groupBy}`
      )
      setSummary(data)
    } catch {
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, groupBy])

  const fetchDetailed = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ start: startDate, end: endDate })
      if (projectFilter) params.set('projectId', projectFilter)
      const data = await api.get<DetailedResponse>(`/reports/detailed?${params}`)
      setDetailed(data)
    } catch {
      setDetailed(null)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, projectFilter])

  useEffect(() => {
    if (tab === 'summary') fetchSummary()
    else fetchDetailed()
  }, [tab, fetchSummary, fetchDetailed])

  const sortedEntries = useMemo(() => {
    if (!detailed) return []
    const entries = [...detailed.entries]
    entries.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'date':
          cmp = a.date.localeCompare(b.date)
          break
        case 'projectName':
          cmp = a.projectName.localeCompare(b.projectName)
          break
        case 'description':
          cmp = a.description.localeCompare(b.description)
          break
        case 'durationMin':
          cmp = a.durationMin - b.durationMin
          break
        case 'billable':
          cmp = (a.billable ? 1 : 0) - (b.billable ? 1 : 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return entries
  }, [detailed, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' ? 'desc' : 'asc')
    }
  }

  function handleExportCsv() {
    const params = new URLSearchParams({ start: startDate, end: endDate })
    if (projectFilter) params.set('projectId', projectFilter)
    window.location.href = `/api/reports/export/csv?${params}`
  }

  const maxMinutes = useMemo(() => {
    if (!summary) return 1
    return Math.max(...summary.groups.map((g) => g.totalMinutes), 1)
  }, [summary])

  const barData = useMemo(() => {
    if (!summary) return []
    return summary.groups.map((g) => ({
      name: g.name,
      hours: +(g.totalMinutes / 60).toFixed(1),
      billable: +(g.billableMinutes / 60).toFixed(1),
      color: g.color,
    }))
  }, [summary])

  const pieData = useMemo(() => {
    if (!summary) return []
    return summary.groups.map((g) => ({
      name: g.name,
      value: g.totalMinutes,
      color: g.color,
    }))
  }, [summary])

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC'
  }

  return (
    <div>
      <h1 className="page-heading text-2xl font-bold text-terminal-text-bright mb-6 font-mono">
        reports
      </h1>

      {/* Tab navigation */}
      <div className="flex gap-6 mb-6 border-b border-terminal-border">
        {(['summary', 'detailed'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 font-mono text-sm capitalize transition-colors cursor-pointer ${
              tab === t
                ? 'text-terminal-green border-b-2 border-terminal-green'
                : 'text-terminal-text hover:text-terminal-text-bright'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-terminal-bg-light border border-terminal-border rounded p-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-terminal-text font-mono">Start</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-terminal-text font-mono">End</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green"
          />
        </div>

        {tab === 'summary' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-terminal-text font-mono">Group by</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green cursor-pointer"
            >
              <option value="project">Project</option>
              <option value="client">Client</option>
            </select>
          </div>
        )}

        {tab === 'detailed' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-terminal-text font-mono">Project</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green cursor-pointer"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto">
          <Button variant="outline" onClick={handleExportCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      {loading && (
        <p className="text-terminal-text font-mono text-sm animate-pulse">Loading...</p>
      )}

      {/* Summary tab */}
      {tab === 'summary' && summary && !loading && (
        <div>
          {/* Totals header */}
          <div className="mb-6 font-mono text-sm text-terminal-text-bright">
            Total:{' '}
            <span className="text-terminal-green">{formatDecimalHours(summary.totalMinutes)}h</span>
            {' '}(Billable:{' '}
            <span className="text-terminal-blue">
              {formatDecimalHours(summary.billableMinutes)}h
            </span>
            )
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Bar chart */}
            <div className="lg:col-span-2 bg-terminal-bg-light border border-terminal-border rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-terminal-text font-mono uppercase tracking-wider">
                  Hours by {groupBy}
                </h3>
                <span className="text-[10px] text-terminal-text font-mono">
                  faded = total &middot; solid = billable
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#b3b1ad', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#2a2a3e' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#b3b1ad', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                    axisLine={{ stroke: '#2a2a3e' }}
                    tickLine={false}
                    unit="h"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151b24',
                      border: '1px solid #2a2a3e',
                      borderRadius: '4px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#e6e1dc' }}
                    itemStyle={{ color: '#b3b1ad' }}
                  />
                  <Bar dataKey="hours" name="Total" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.7} />
                    ))}
                  </Bar>
                  <Bar dataKey="billable" name="Billable" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut chart */}
            <div className="bg-terminal-bg-light border border-terminal-border rounded p-4">
              <h3 className="text-xs text-terminal-text font-mono mb-3 uppercase tracking-wider">
                Distribution
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151b24',
                      border: '1px solid #2a2a3e',
                      borderRadius: '4px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${(value / 60).toFixed(1)}h`, 'Hours']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary table */}
          <div className="border border-terminal-border rounded overflow-hidden">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="bg-terminal-surface text-terminal-text text-left">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 text-right">Hours</th>
                  <th className="px-4 py-3 text-right">Billable</th>
                  <th className="px-4 py-3 text-right">Entries</th>
                  <th className="px-4 py-3 w-48"></th>
                </tr>
              </thead>
              <tbody>
                {summary.groups.map((g) => (
                  <tr
                    key={g.id}
                    className="border-t border-terminal-border bg-terminal-bg-light hover:border-l-2 hover:border-l-terminal-green transition-colors"
                  >
                    <td className="px-4 py-3 text-terminal-text-bright flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: g.color }}
                      />
                      {g.name}
                    </td>
                    <td className="px-4 py-3 text-right text-terminal-text-bright">
                      {formatDecimalHours(g.totalMinutes)}h
                    </td>
                    <td className="px-4 py-3 text-right text-terminal-blue">
                      {formatDecimalHours(g.billableMinutes)}h
                    </td>
                    <td className="px-4 py-3 text-right text-terminal-text">{g.entries}</td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-terminal-surface rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${(g.totalMinutes / maxMinutes) * 100}%`,
                            backgroundColor: g.color,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed tab */}
      {tab === 'detailed' && detailed && !loading && (
        <div>
          <div className="mb-4 font-mono text-sm text-terminal-text-bright">
            Total:{' '}
            <span className="text-terminal-green">
              {formatDecimalHours(detailed.totalMinutes)}h
            </span>
            {' '}({detailed.entries.length} entries)
          </div>

          <div className="border border-terminal-border rounded overflow-hidden">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="bg-terminal-surface text-terminal-text text-left">
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-terminal-text-bright select-none"
                    onClick={() => handleSort('date')}
                  >
                    Date{sortArrow('date')}
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-terminal-text-bright select-none"
                    onClick={() => handleSort('projectName')}
                  >
                    Project{sortArrow('projectName')}
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-terminal-text-bright select-none"
                    onClick={() => handleSort('description')}
                  >
                    Description{sortArrow('description')}
                  </th>
                  <th className="px-4 py-3">Time</th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-terminal-text-bright select-none"
                    onClick={() => handleSort('durationMin')}
                  >
                    Hours{sortArrow('durationMin')}
                  </th>
                  <th
                    className="px-4 py-3 text-center cursor-pointer hover:text-terminal-text-bright select-none"
                    onClick={() => handleSort('billable')}
                  >
                    Billable{sortArrow('billable')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-terminal-border bg-terminal-bg-light hover:border-l-2 hover:border-l-terminal-green transition-colors"
                  >
                    <td className="px-4 py-3 text-terminal-text whitespace-nowrap">
                      {formatShortDate(entry.date)}
                    </td>
                    <td className="px-4 py-3 text-terminal-text-bright whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: entry.projectColor }}
                        />
                        {entry.projectName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-terminal-text max-w-xs truncate">
                      {entry.description}
                    </td>
                    <td className="px-4 py-3 text-terminal-text whitespace-nowrap">
                      {formatTimeRange(entry.startTime, entry.endTime)}
                    </td>
                    <td className="px-4 py-3 text-right text-terminal-text-bright">
                      {formatDecimalHours(entry.durationMin)}h
                    </td>
                    <td className="px-4 py-3 text-center">
                      {entry.billable ? (
                        <span className="text-terminal-green">&#10003;</span>
                      ) : (
                        <span className="text-terminal-text">&#10007;</span>
                      )}
                    </td>
                  </tr>
                ))}
                {sortedEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-terminal-text">
                      No entries found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
              {sortedEntries.length > 0 && (
                <tfoot>
                  <tr className="border-t border-terminal-border bg-terminal-surface">
                    <td colSpan={4} className="px-4 py-3 text-terminal-text-bright font-medium">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-terminal-green font-medium">
                      {formatDecimalHours(detailed.totalMinutes)}h
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'summary' && summary && summary.groups.length === 0 && (
        <p className="text-terminal-text font-mono text-sm mt-4">
          No data found for this period.
        </p>
      )}
    </div>
  )
}
