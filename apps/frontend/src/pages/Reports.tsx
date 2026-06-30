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
import { Card } from '../components/ui/Card'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatCard } from '../components/ui/StatCard'
import { ProjectBadge } from '../components/ProjectBadge'
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { chart, axisTick, gridProps, barCursor } from '../lib/chart-theme'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { toast } from '../store/toasts'
import { formatDecimalHours, formatLocalDate } from '../lib/time'

// Opacity for the faded "total" bar that sits behind the solid "billable" bar.
const BAR_FADED_OPACITY = 0.4

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
  return formatLocalDate(new Date())
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start || !end) return '—'
  const fmt = (t: string) => t.slice(0, 5)
  return `${fmt(start)}–${fmt(end)}`
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
  const [error, setError] = useState(false)

  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { projects, fetch: fetchProjects } = useProjects()

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await api.get<SummaryResponse>(
        `/reports/summary?start=${startDate}&end=${endDate}&groupBy=${groupBy}`
      )
      setSummary(data)
    } catch {
      setSummary(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, groupBy])

  const fetchDetailed = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams({ start: startDate, end: endDate })
      if (projectFilter) params.set('projectId', projectFilter)
      const data = await api.get<DetailedResponse>(`/reports/detailed?${params}`)
      setDetailed(data)
    } catch {
      setDetailed(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, projectFilter])

  const refetch = useCallback(() => {
    if (tab === 'summary') fetchSummary()
    else fetchDetailed()
  }, [tab, fetchSummary, fetchDetailed])

  useEffect(() => {
    refetch()
  }, [refetch])

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
    try {
      const params = new URLSearchParams({ start: startDate, end: endDate })
      if (projectFilter) params.set('projectId', projectFilter)
      window.location.href = `/api/reports/export/csv?${params}`
    } catch {
      toast({ variant: 'danger', message: 'CSV export failed' })
    }
  }

  const maxMinutes = useMemo(() => {
    if (!summary) return 1
    return Math.max(...summary.groups.map((g) => g.totalMinutes), 1)
  }, [summary])

  const barData = useMemo(() => {
    if (!summary) return []
    return summary.groups.map((g) => ({
      name: g.name,
      hours: +(g.totalMinutes / 60).toFixed(2),
      billable: +(g.billableMinutes / 60).toFixed(2),
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
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  const dateInputClass =
    'bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm transition-colors duration-150 focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30'

  return (
    <div>
      <h1 className="page-heading text-2xl font-bold text-terminal-text-bright mb-6 font-mono">
        reports
      </h1>

      {/* Tab navigation */}
      <div className="mb-6">
        <SegmentedControl
          options={[
            { value: 'summary', label: 'Summary' },
            { value: 'detailed', label: 'Detailed' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />
      </div>

      {/* Filter bar */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-terminal-text-bright font-mono">Start</label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className={dateInputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-terminal-text-bright font-mono">End</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className={dateInputClass}
            />
          </div>

          {tab === 'summary' && (
            <Select
              label="Group by"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              options={[
                { value: 'project', label: 'Project' },
                { value: 'client', label: 'Client' },
              ]}
            />
          )}

          {tab === 'detailed' && (
            <Select
              label="Project"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}

          <div className="ml-auto">
            <Button
              variant="outline"
              className="active:translate-y-px"
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Content states */}
      {loading ? (
        tab === 'summary' ? (
          <SummarySkeleton />
        ) : (
          <DetailedSkeleton />
        )
      ) : error ? (
        <ErrorState message="Failed to load report data." onRetry={refetch} />
      ) : tab === 'summary' && summary ? (
        summary.groups.length === 0 ? (
          <EmptyState
            prompt="no data in range"
            message="No time was tracked for the selected period. Adjust the date range to see a report."
          />
        ) : (
          <div className="animate-fade-in">
            {/* Totals */}
            <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
              <StatCard
                label="Total Hours"
                value={`${formatDecimalHours(summary.totalMinutes)}h`}
                tone="green"
              />
              <StatCard
                label="Billable Hours"
                value={`${formatDecimalHours(summary.billableMinutes)}h`}
                tone="blue"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Bar chart */}
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]">
                    <span className="text-terminal-green">#</span> hours by {groupBy}
                  </span>
                  <span className="hidden sm:inline text-[10px] text-terminal-text-muted font-mono">
                    faded = total &middot; solid = billable
                  </span>
                </div>
                {barData.length > 0 ? (
                  <div className="h-[200px] sm:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid {...gridProps} />
                        <XAxis
                          dataKey="name"
                          tick={axisTick}
                          axisLine={{ stroke: chart.grid }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={axisTick}
                          axisLine={{ stroke: chart.grid }}
                          tickLine={false}
                          unit="h"
                        />
                        <Tooltip
                          cursor={barCursor}
                          content={<ChartTooltip formatValue={(v) => `${v}h`} />}
                        />
                        <Bar dataKey="hours" name="Total" radius={[4, 4, 0, 0]}>
                          {barData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} fillOpacity={BAR_FADED_OPACITY} />
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
                ) : (
                  <EmptyState variant="chart" prompt="no data to chart" />
                )}
              </Card>

              {/* Donut chart */}
              <Card>
                <div className="mb-3">
                  <span className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]">
                    <span className="text-terminal-green">#</span> distribution
                  </span>
                </div>
                {pieData.length > 0 ? (
                  <div className="h-[200px] sm:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
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
                          content={
                            <ChartTooltip formatValue={(v) => `${(v / 60).toFixed(2)}h`} />
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState variant="chart" prompt="no data to chart" />
                )}
              </Card>
            </div>

            {/* Summary table */}
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="bg-terminal-surface text-left text-[11px] uppercase tracking-wide text-terminal-text-muted">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 text-right font-medium">Hours</th>
                      <th className="px-4 py-3 text-right font-medium">Billable</th>
                      <th className="px-4 py-3 text-right font-medium">Entries</th>
                      <th className="px-4 py-3 w-48"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.groups.map((g) => (
                      <tr
                        key={g.id}
                        className="border-t border-terminal-border bg-terminal-bg-light transition-colors hover:border-l-2 hover:border-l-terminal-green focus-within:ring-1 focus-within:ring-inset focus-within:ring-terminal-green/40"
                      >
                        <td className="px-4 py-3">
                          <ProjectBadge name={g.name} color={g.color} />
                        </td>
                        <td className="px-4 py-3 text-right font-data text-terminal-text-bright">
                          {formatDecimalHours(g.totalMinutes)}h
                        </td>
                        <td className="px-4 py-3 text-right font-data text-terminal-blue">
                          {formatDecimalHours(g.billableMinutes)}h
                        </td>
                        <td className="px-4 py-3 text-right font-data text-terminal-text-muted">
                          {g.entries}
                        </td>
                        <td className="px-4 py-3">
                          <ProgressBar value={g.totalMinutes} max={maxMinutes} color={g.color} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )
      ) : tab === 'detailed' && detailed ? (
        detailed.entries.length === 0 ? (
          <EmptyState
            prompt="no entries in range"
            message="No time entries match this period or project filter. Try widening the date range."
          />
        ) : (
          <div className="animate-fade-in">
            {/* Totals */}
            <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
              <StatCard
                label="Total Hours"
                value={`${formatDecimalHours(detailed.totalMinutes)}h`}
                tone="green"
              />
              <StatCard label="Entries" value={detailed.entries.length} tone="bright" />
            </div>

            {/* Detailed table */}
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="bg-terminal-surface text-left text-[11px] uppercase tracking-wide text-terminal-text-muted">
                      <th
                        className="px-4 py-3 font-medium cursor-pointer select-none transition-colors hover:text-terminal-text-bright"
                        onClick={() => handleSort('date')}
                      >
                        Date{sortArrow('date')}
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer select-none transition-colors hover:text-terminal-text-bright"
                        onClick={() => handleSort('projectName')}
                      >
                        Project{sortArrow('projectName')}
                      </th>
                      <th
                        className="px-4 py-3 font-medium cursor-pointer select-none transition-colors hover:text-terminal-text-bright"
                        onClick={() => handleSort('description')}
                      >
                        Description{sortArrow('description')}
                      </th>
                      <th className="hidden sm:table-cell px-4 py-3 font-medium">Time</th>
                      <th
                        className="px-4 py-3 text-right font-medium cursor-pointer select-none transition-colors hover:text-terminal-text-bright"
                        onClick={() => handleSort('durationMin')}
                      >
                        Hours{sortArrow('durationMin')}
                      </th>
                      <th
                        className="hidden sm:table-cell px-4 py-3 text-center font-medium cursor-pointer select-none transition-colors hover:text-terminal-text-bright"
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
                        className="border-t border-terminal-border bg-terminal-bg-light transition-colors hover:border-l-2 hover:border-l-terminal-green focus-within:ring-1 focus-within:ring-inset focus-within:ring-terminal-green/40"
                      >
                        <td className="px-4 py-3 font-data text-terminal-text whitespace-nowrap">
                          {formatShortDate(entry.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <ProjectBadge name={entry.projectName} color={entry.projectColor} />
                        </td>
                        <td className="px-4 py-3 font-prose text-terminal-text max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 font-data text-terminal-text whitespace-nowrap">
                          {formatTimeRange(entry.startTime, entry.endTime)}
                        </td>
                        <td className="px-4 py-3 text-right font-data text-terminal-text-bright whitespace-nowrap">
                          {formatDecimalHours(entry.durationMin)}h
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-center">
                          {entry.billable ? (
                            <Badge variant="success">billable</Badge>
                          ) : (
                            <Badge variant="muted">&#8212;</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-terminal-border bg-terminal-surface">
                      <td colSpan={3} className="px-4 py-3 font-medium text-terminal-text-bright">
                        Total
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3" />
                      <td className="px-4 py-3 text-right font-data font-medium text-terminal-green whitespace-nowrap">
                        {formatDecimalHours(detailed.totalMinutes)}h
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>
        )
      ) : null}
    </div>
  )
}

function SummarySkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <Skeleton className="h-3 w-32 mb-3" />
          <Skeleton className="h-[200px] sm:h-[260px] w-full" />
        </Card>
        <Card>
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-[200px] sm:h-[260px] w-full" />
        </Card>
      </div>
      <Card padding="none" className="overflow-hidden">
        <div className="divide-y divide-terminal-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-16 ml-auto" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-40" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function DetailedSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <Card padding="none" className="overflow-hidden">
        <div className="divide-y divide-terminal-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
