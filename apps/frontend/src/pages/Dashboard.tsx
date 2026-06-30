import { useState, useEffect, useCallback } from 'react'
import { useCommandPalette } from '../components/CommandPalette'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Label,
} from 'recharts'
import type { DashboardResponse } from '@timesheet/shared'
import { computeBudgetStatus, budgetLevelColors } from '@timesheet/shared'
import { api } from '../api/client'
import { formatDecimalHours, formatLocalDate } from '../lib/time'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton'
import { chart, CHART_PALETTE, axisTick, gridProps, barCursor } from '../lib/chart-theme'
import { ChartTooltip } from '../components/charts/ChartTooltip'

type Range =
  | 'today'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'current_year'
  | 'custom'

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'current_year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
]

function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function firstOfMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function Dashboard() {
  const [range, setRange] = useState<Range>('this_week')
  const [customStart, setCustomStart] = useState<string>(firstOfMonthStr())
  const [customEnd, setCustomEnd] = useState<string>(formatLocalDate(new Date()))
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')
  const [editingThreshold, setEditingThreshold] = useState(false)
  const [thresholdInput, setThresholdInput] = useState('')

  const fetchDashboard = useCallback(async (r: Range, s: string, e: string) => {
    setLoading(true)
    setError(null)
    try {
      const qs = r === 'custom' ? `?range=custom&start=${s}&end=${e}` : `?range=${r}`
      const result = await api.get<DashboardResponse>(`/dashboard${qs}`)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard(range, customStart, customEnd)
  }, [range, customStart, customEnd, fetchDashboard])

  const handleTargetSave = useCallback(async () => {
    const num = parseFloat(targetInput)
    if (isNaN(num) || num < 0) return
    try {
      await api.put('/settings/monthlyRevenueTarget', { value: String(num) })
      setEditingTarget(false)
      fetchDashboard(range, customStart, customEnd)
    } catch {
      // keep editing state open so user can retry
    }
  }, [targetInput, range, customStart, customEnd, fetchDashboard])

  const handleThresholdSave = useCallback(async () => {
    const num = parseInt(thresholdInput, 10)
    if (isNaN(num) || num < 1) return
    try {
      await api.put('/settings/chartWeekThresholdMonths', { value: String(num) })
      setEditingThreshold(false)
      fetchDashboard(range, customStart, customEnd)
    } catch {
      // keep editing state open so user can retry
    }
  }, [thresholdInput, range, customStart, customEnd, fetchDashboard])

  // Build stacked bar chart data
  const allProjectNames = data
    ? [...new Set(data.series.flatMap((d) => d.projects.map((p) => p.projectName)))]
    : []

  const projectColorMap: Record<string, string> = {}
  if (data) {
    for (const bucket of data.series) {
      for (const p of bucket.projects) {
        if (!projectColorMap[p.projectName]) {
          projectColorMap[p.projectName] = p.color
        }
      }
    }
  }

  const barData = data
    ? data.series.map((bucket) => {
        const row: Record<string, string | number> = { date: formatDayLabel(bucket.date) }
        for (const p of bucket.projects) {
          row[p.projectName] = +((p.minutes / 60) * p.hourlyRate).toFixed(2)
          row[`_hours_${p.projectName}`] = +(p.minutes / 60).toFixed(2)
        }
        return row
      })
    : []

  // Donut chart data
  const pieData = data
    ? data.projectSplit.map((p, i) => ({
        name: p.projectName,
        value: p.totalMinutes,
        color: p.color || CHART_PALETTE[i % CHART_PALETTE.length],
        percentage: p.percentage,
      }))
    : []

  const totalHours = data ? formatDecimalHours(data.totalMinutes) : '0.0'

  // Revenue max for progress bar scaling
  const revenueMax = data
    ? Math.max(...data.revenue.projects.map((p) => p.earned), 1)
    : 1

  return (
    <div>
      <h1 className="page-heading text-2xl font-bold text-terminal-text-bright mb-6 font-mono">
        dashboard
      </h1>

      {/* Range selector */}
      <div className="mb-4 overflow-x-auto">
        <SegmentedControl
          className="flex-nowrap"
          options={RANGE_OPTIONS}
          value={range}
          onChange={(v) => setRange(v as Range)}
        />
      </div>

      {/* Custom date range inputs */}
      {range === 'custom' && (
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <label className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]">
              Start
            </label>
            <input
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-terminal-inset border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]">
              End
            </label>
            <input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-terminal-inset border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green"
            />
          </div>
        </div>
      )}

      {/* Command palette hint */}
      <button
        onClick={() => useCommandPalette.getState().toggle()}
        className="mb-6 flex items-center gap-2 text-terminal-text-muted hover:text-terminal-text-bright font-mono text-xs transition-colors cursor-pointer"
      >
        <kbd className="px-1.5 py-0.5 rounded border border-terminal-border text-[10px]">⌘K</kbd>
        <span>open command palette for quick navigation and time entry</span>
      </button>

      {loading && !data ? (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Skeleton className="lg:col-span-3 h-[200px] sm:h-[260px] rounded-lg" />
            <Skeleton className="lg:col-span-2 h-[200px] sm:h-[260px] rounded-lg" />
          </div>
        </div>
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => fetchDashboard(range, customStart, customEnd)}
        />
      ) : data ? (
        <div className="animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Hours" value={`${totalHours}h`} tone="green" className="min-w-0" />
            <StatCard
              label="Top Project"
              value={data.topProject?.name ?? '--'}
              tone="green"
              sub={data.topProject ? `${formatDecimalHours(data.topProject.minutes)}h` : undefined}
              className="min-w-0"
            />
            <StatCard
              label="Top Client"
              value={data.topClient?.name ?? '--'}
              tone="green"
              sub={data.topClient ? `${formatDecimalHours(data.topClient.minutes)}h` : undefined}
              className="min-w-0"
            />
          </div>

          {/* Revenue: month forecast / annual forecast / period summary */}
          {data.revenue.forecast && (() => {
            const f = data.revenue.forecast
            const hours = formatDecimalHours(data.totalMinutes)
            const title =
              f.mode === 'year_forecast'
                ? 'Annual Forecast'
                : f.mode === 'month_forecast'
                  ? 'Monthly Forecast'
                  : `${f.periodLabel} Summary`
            const isForecast = f.mode === 'month_forecast' || f.mode === 'year_forecast'

            return (
              <Card elevated className="mb-8">
                <h2 className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em] mb-4">
                  <span className="text-terminal-green">$ </span>
                  {title}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {f.mode === 'month_forecast' && (
                    <>
                      <StatCard
                        label="Forecast (end of month)"
                        value={formatEuro(f.forecastValue)}
                        tone="green"
                        sub={`${formatEuro(f.avgDailyRevenue)}/working day · ${f.workingDaysElapsed}/${f.workingDaysTotal} days elapsed`}
                        className="min-w-0"
                      />
                      <StatCard
                        label="Earned This Month"
                        value={formatEuro(f.earnedToDate)}
                        tone="blue"
                        className="min-w-0"
                      />
                      {/* Editable monthly target */}
                      <Card elevated className="min-w-0">
                        <p className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]">
                          Monthly Target
                        </p>
                        {editingTarget ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              handleTargetSave()
                            }}
                            className="flex items-center gap-2 mt-1"
                          >
                            <input
                              type="number"
                              autoFocus
                              step={100}
                              min={0}
                              value={targetInput}
                              onChange={(e) => setTargetInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') setEditingTarget(false)
                              }}
                              onBlur={() => setEditingTarget(false)}
                              className="w-32 bg-terminal-inset border border-terminal-border rounded px-2 py-1 text-terminal-text-bright font-data text-lg focus:border-terminal-green focus:outline-none"
                            />
                            <span className="text-terminal-text-muted font-mono text-sm">EUR</span>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetInput(f.monthlyTarget != null ? String(f.monthlyTarget) : '')
                              setEditingTarget(true)
                            }}
                            className="font-data text-metric mt-1 truncate block text-terminal-text-bright hover:text-terminal-green transition-colors cursor-pointer"
                          >
                            {f.monthlyTarget != null ? formatEuro(f.monthlyTarget) : '[set target]'}
                          </button>
                        )}
                      </Card>
                    </>
                  )}

                  {f.mode === 'year_forecast' && (
                    <>
                      <StatCard
                        label="Forecast (end of year)"
                        value={formatEuro(f.forecastValue)}
                        tone="green"
                        sub={`${formatEuro(f.avgDailyRevenue)}/working day · ${f.workingDaysElapsed}/${f.workingDaysTotal} days elapsed`}
                        className="min-w-0"
                      />
                      <StatCard
                        label="Earned YTD"
                        value={formatEuro(f.earnedToDate)}
                        tone="blue"
                        className="min-w-0"
                      />
                      <StatCard
                        label="Annual Target"
                        value={f.target != null ? formatEuro(f.target) : '—'}
                        tone="bright"
                        sub={f.target != null ? 'monthly target × 12' : 'set a monthly target on This Month'}
                        className="min-w-0"
                      />
                    </>
                  )}

                  {f.mode === 'summary' && f.monthsInPeriod >= 2 && (
                    <>
                      <StatCard
                        label="Period Total"
                        value={formatEuro(f.periodRevenue)}
                        tone="green"
                        sub={`${f.workingDaysTotal} working days`}
                        className="min-w-0"
                      />
                      <StatCard
                        label="Avg / Month"
                        value={formatEuro(f.avgMonthlyRevenue)}
                        tone="blue"
                        sub={`over ${f.monthsInPeriod} months`}
                        className="min-w-0"
                      />
                      <StatCard
                        label="Avg / Working Day"
                        value={formatEuro(f.avgDailyRevenue)}
                        tone="bright"
                        sub={`${hours}h tracked`}
                        className="min-w-0"
                      />
                    </>
                  )}

                  {f.mode === 'summary' && f.monthsInPeriod < 2 && (
                    <>
                      <StatCard
                        label="Period Total"
                        value={formatEuro(f.periodRevenue)}
                        tone="green"
                        sub={`${f.workingDaysTotal} working days`}
                        className="min-w-0"
                      />
                      <StatCard
                        label="Avg / Working Day"
                        value={formatEuro(f.avgDailyRevenue)}
                        tone="blue"
                        sub={`${hours}h tracked`}
                        className="min-w-0"
                      />
                      <StatCard
                        label="Hours Tracked"
                        value={`${hours}h`}
                        tone="bright"
                        className="min-w-0"
                      />
                    </>
                  )}
                </div>

                {/* Target progress — forecast modes with a target set */}
                {isForecast &&
                  f.target != null &&
                  f.targetProgress != null && (() => {
                    let barColor: string = chart.danger
                    let colorText = 'text-terminal-danger'
                    let paceLabel = 'Behind Target'

                    if (f.forecastValue >= f.target) {
                      barColor = chart.green
                      colorText = 'text-terminal-green'
                      paceLabel = 'On Track'
                    } else if (f.targetProgress >= 80) {
                      barColor = chart.warning
                      colorText = 'text-terminal-warning'
                      paceLabel = 'Slightly Behind'
                    }

                    return (
                      <div className="mt-4">
                        <div className="flex justify-between mb-1 font-mono text-xs">
                          <span className={colorText}>
                            {f.targetProgress.toFixed(1)}% of target
                          </span>
                          <span className={colorText}>{paceLabel}</span>
                        </div>
                        <ProgressBar value={f.targetProgress} max={100} color={barColor} />
                      </div>
                    )
                  })()}
              </Card>
            )
          })()}

          {data.totalMinutes === 0 ? (
            <EmptyState
              prompt="no entries in range"
              message="No time tracked for the selected range. Add an entry to see your revenue charts and top activities."
              action={{ label: '[add time]', onClick: () => useCommandPalette.getState().toggle() }}
            />
          ) : (
            <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            {/* Stacked bar chart */}
            <Card elevated className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]">
                  <span className="text-terminal-green">$ </span>
                  {data.granularity === 'week' ? 'Revenue per Week' : 'Revenue per Day'}
                </h2>
                <div className="flex items-center gap-1 font-mono text-xs text-terminal-text-muted">
                  <span>weekly after</span>
                  {editingThreshold ? (
                    <input
                      type="number"
                      autoFocus
                      min={1}
                      step={1}
                      value={thresholdInput}
                      onChange={(e) => setThresholdInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleThresholdSave()
                        } else if (e.key === 'Escape') {
                          setEditingThreshold(false)
                        }
                      }}
                      onBlur={() => setEditingThreshold(false)}
                      className="w-12 bg-terminal-inset border border-terminal-border rounded px-1 py-0.5 text-center text-terminal-text-bright focus:border-terminal-green focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setThresholdInput(String(data.chartWeekThresholdMonths))
                        setEditingThreshold(true)
                      }}
                      className="text-terminal-green hover:underline cursor-pointer"
                    >
                      {data.chartWeekThresholdMonths}
                    </button>
                  )}
                  <span>mo</span>
                </div>
              </div>
              <div className="h-[200px] sm:h-[260px]">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid {...gridProps} />
                      <XAxis
                        dataKey="date"
                        tick={axisTick}
                        axisLine={{ stroke: chart.grid }}
                        tickLine={{ stroke: chart.grid }}
                        interval="preserveStartEnd"
                        minTickGap={16}
                      />
                      <YAxis
                        tick={axisTick}
                        axisLine={{ stroke: chart.grid }}
                        tickLine={{ stroke: chart.grid }}
                        unit="€"
                      />
                      <Tooltip
                        cursor={barCursor}
                        content={
                          <ChartTooltip
                            formatValue={(value, name, entry) => {
                              const hours = entry?.payload?.[`_hours_${name}`] ?? 0
                              return `${formatEuro(value)} (${hours}h)`
                            }}
                          />
                        }
                      />
                      {allProjectNames.map((name, i) => (
                        <Bar
                          key={name}
                          dataKey={name}
                          stackId="revenue"
                          fill={projectColorMap[name] ?? CHART_PALETTE[i % CHART_PALETTE.length]}
                          radius={i === allProjectNames.length - 1 ? [3, 3, 0, 0] : undefined}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    variant="chart"
                    prompt="no data in range"
                    message="Track time against a project to see revenue per day."
                  />
                )}
              </div>
            </Card>

            {/* Donut chart */}
            <Card elevated className="lg:col-span-2">
              <h2 className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em] mb-4">
                <span className="text-terminal-green">$ </span>
                Time by Project
              </h2>
              <div className="h-[200px] sm:h-[260px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        paddingAngle={2}
                        stroke={chart.surface}
                        strokeWidth={2}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                        <Label
                          content={(props: any) => {
                            const vb = props?.viewBox
                            if (!vb || vb.cx == null) return null
                            const { cx, cy } = vb
                            return (
                              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                                <tspan
                                  x={cx}
                                  dy="-0.2em"
                                  fill={chart.textBright}
                                  style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                  {totalHours}
                                </tspan>
                                <tspan
                                  x={cx}
                                  dy="1.5em"
                                  fill={chart.textMuted}
                                  style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                  hours
                                </tspan>
                              </text>
                            )
                          }}
                        />
                      </Pie>
                      <Tooltip
                        content={
                          <ChartTooltip formatValue={(value) => `${formatDecimalHours(value)}h`} />
                        }
                      />
                      <Legend
                        verticalAlign="bottom"
                        formatter={(value: string) => {
                          const item = pieData.find((p) => p.name === value)
                          return (
                            <span className="text-terminal-text font-mono text-xs">
                              {value} {item ? `${item.percentage}%` : ''}
                            </span>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    variant="chart"
                    prompt="no data in range"
                    message="Track time to see how it splits across projects."
                  />
                )}
              </div>
            </Card>
          </div>

          {/* Bottom row: Revenue + Top Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue */}
            <Card>
              <h2 className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em] mb-4">
                <span className="text-terminal-green">$ </span>
                Revenue
              </h2>
              <div className="flex gap-8 mb-4">
                <div className="min-w-0">
                  <p className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]">
                    This Month
                  </p>
                  <p className="text-terminal-green font-data text-xl font-bold">
                    {formatEuro(data.revenue.earnedThisMonth)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]">
                    Year to Date
                  </p>
                  <p className="text-terminal-blue font-data text-xl font-bold">
                    {formatEuro(data.revenue.earnedYTD)}
                  </p>
                </div>
              </div>
              {data.revenue.projects.length > 0 ? (
                <ul className="space-y-3">
                  {data.revenue.projects.map((p) => {
                    const pct = revenueMax > 0 ? (p.earned / revenueMax) * 100 : 0
                    const budgetStatus = p.budgetHours !== null
                      ? computeBudgetStatus(String(p.budgetHours), Math.round(p.trackedHours * 60))
                      : null
                    const textColor = budgetStatus
                      ? budgetLevelColors(budgetStatus.level).text
                      : 'text-terminal-green'
                    const barColor = budgetStatus
                      ? budgetStatus.level === 'ok'
                        ? chart.green
                        : budgetStatus.level === 'warning'
                          ? chart.warning
                          : chart.danger
                      : chart.green
                    return (
                      <li key={p.projectId} className="font-mono text-sm">
                        <div className="flex justify-between mb-1 gap-2">
                          <span className="text-terminal-text-bright truncate">{p.projectName}</span>
                          <span className={`${textColor} font-data shrink-0`}>{formatEuro(p.earned)}</span>
                        </div>
                        <ProgressBar value={pct} max={100} color={barColor} />
                        {p.budgetHours !== null && (
                          <div className="flex justify-between mt-0.5 text-xs text-terminal-text-muted font-data">
                            <span>{p.trackedHours.toFixed(1)}h tracked</span>
                            <span>{Math.max(p.budgetHours - p.trackedHours, 0).toFixed(1)}h remaining</span>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <EmptyState
                  variant="chart"
                  prompt="no revenue data"
                  message="Set hourly rates on your projects to track earnings."
                />
              )}
            </Card>

            {/* Top Activities */}
            <Card>
              <h2 className="text-label-caps text-terminal-text-muted text-xs tracking-[0.08em] mb-4">
                <span className="text-terminal-green">$ </span>
                Top Activities
              </h2>
              {data.topDescriptions.length > 0 ? (
                <ol className="space-y-2">
                  {data.topDescriptions.map((item, i) => (
                    <li key={i} className="flex items-baseline gap-3 text-sm">
                      <span className="text-terminal-text-muted font-data w-5 text-right shrink-0">{i + 1}.</span>
                      <span className="text-terminal-text-bright font-prose truncate flex-1">
                        {item.description || '(no description)'}
                      </span>
                      <span className="text-terminal-green font-data shrink-0">
                        {formatDecimalHours(item.minutes)}h
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  variant="chart"
                  prompt="no activities recorded"
                  message="Add descriptions to your time entries to see your most common work."
                />
              )}
            </Card>
          </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
