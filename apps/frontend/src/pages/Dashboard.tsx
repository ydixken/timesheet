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
} from 'recharts'
import type { DashboardResponse } from '@timesheet/shared'
import { computeBudgetStatus, budgetLevelColors } from '@timesheet/shared'
import { api } from '../api/client'
import { formatDecimalHours } from '../lib/time'

type Range = 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months'

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
]

const CHART_TEXT = '#b3b1ad'
const CHART_GRID = '#2a2a3e'
const CHART_GREEN = '#39ff14'
const FALLBACK_COLORS = ['#39ff14', '#00d9ff', '#bd93f9', '#f1fa8c', '#ff5555', '#2ed573', '#50fa7b']

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents)
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function Dashboard() {
  const [range, setRange] = useState<Range>('this_week')
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  const fetchDashboard = useCallback(async (r: Range) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<DashboardResponse>(`/dashboard?range=${r}`)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard(range)
  }, [range, fetchDashboard])

  const handleTargetSave = useCallback(async () => {
    const num = parseFloat(targetInput)
    if (isNaN(num) || num < 0) return
    try {
      await api.put('/settings/monthlyRevenueTarget', { value: String(num) })
      setEditingTarget(false)
      fetchDashboard(range)
    } catch {
      // keep editing state open so user can retry
    }
  }, [targetInput, range, fetchDashboard])

  // Build stacked bar chart data
  const allProjectNames = data
    ? [...new Set(data.dailySeries.flatMap((d) => d.projects.map((p) => p.projectName)))]
    : []

  const projectColorMap: Record<string, string> = {}
  if (data) {
    for (const day of data.dailySeries) {
      for (const p of day.projects) {
        if (!projectColorMap[p.projectName]) {
          projectColorMap[p.projectName] = p.color
        }
      }
    }
  }

  const barData = data
    ? data.dailySeries.map((day) => {
        const row: Record<string, string | number> = { date: formatDayLabel(day.date) }
        for (const p of day.projects) {
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
        color: p.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
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
      <div className="flex items-center gap-2 mb-6">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`px-3 py-1.5 rounded font-mono text-sm transition-all duration-150 cursor-pointer border ${
              range === opt.value
                ? 'bg-terminal-green text-terminal-bg border-terminal-green'
                : 'border-terminal-border text-terminal-text hover:border-terminal-green hover:text-terminal-green'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Command palette hint */}
      <button
        onClick={() => useCommandPalette.getState().toggle()}
        className="mb-6 flex items-center gap-2 text-terminal-text/40 hover:text-terminal-text/70 font-mono text-xs transition-colors cursor-pointer"
      >
        <kbd className="px-1.5 py-0.5 rounded border border-terminal-border text-[10px]">⌘K</kbd>
        <span>open command palette for quick navigation and time entry</span>
      </button>

      {loading && !data ? (
        <p className="text-terminal-text font-mono text-sm">Loading...</p>
      ) : error ? (
        <p className="text-terminal-danger font-mono text-sm">{error}</p>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <KpiCard label="Total Hours" value={`${totalHours}h`} />
            <KpiCard
              label="Top Project"
              value={data.topProject?.name ?? '--'}
              sub={data.topProject ? `${formatDecimalHours(data.topProject.minutes)}h` : undefined}
            />
            <KpiCard
              label="Top Client"
              value={data.topClient?.name ?? '--'}
              sub={data.topClient ? `${formatDecimalHours(data.topClient.minutes)}h` : undefined}
            />
          </div>

          {/* Revenue Forecast / Period Summary */}
          {data.revenue.forecast && (() => {
            const f = data.revenue.forecast
            return (
              <div className="bg-terminal-bg-light border border-terminal-border rounded-lg p-4 mb-8">
                <h2 className="text-terminal-text-bright font-mono text-sm font-bold mb-4">
                  {f.isPastPeriod ? `${f.periodLabel} Summary` : 'Monthly Forecast'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1 — Forecast or Period Total */}
                  <div>
                    <p className="text-terminal-text font-mono text-xs mb-1">
                      {f.isPastPeriod ? 'Period Total' : 'Forecast (end of month)'}
                    </p>
                    <p className="text-terminal-green font-mono text-2xl font-bold">
                      {formatEuro(f.isPastPeriod ? f.periodRevenue : f.forecastedMonthEnd)}
                    </p>
                    <p className="text-terminal-text font-mono text-xs mt-1">
                      {formatEuro(f.avgDailyRevenue)}/working day
                      {' \u00b7 '}
                      {f.isPastPeriod
                        ? `${f.workingDaysTotal} working days`
                        : `${f.workingDaysElapsed}/${f.workingDaysTotal} days elapsed`}
                    </p>
                  </div>

                  {/* Column 2 — Period Revenue or Earned This Month */}
                  <div>
                    <p className="text-terminal-text font-mono text-xs mb-1">
                      {f.isPastPeriod ? 'Avg Daily Revenue' : 'Earned This Month'}
                    </p>
                    <p className="text-terminal-blue font-mono text-2xl font-bold">
                      {f.isPastPeriod
                        ? formatEuro(f.avgDailyRevenue)
                        : formatEuro(data.revenue.earnedThisMonth)}
                    </p>
                    {f.isPastPeriod && (
                      <p className="text-terminal-text font-mono text-xs mt-1">
                        across {f.workingDaysTotal} working days
                      </p>
                    )}
                  </div>

                  {/* Column 3 — Monthly Target (only for current periods) */}
                  <div>
                    <p className="text-terminal-text font-mono text-xs mb-1">
                      Monthly Target
                    </p>
                    {f.isPastPeriod ? (
                      <p className="text-terminal-text font-mono text-2xl font-bold">
                        {f.monthlyTarget != null ? formatEuro(f.monthlyTarget) : '--'}
                      </p>
                    ) : editingTarget ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleTargetSave()
                        }}
                        className="flex items-center gap-2"
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
                          className="w-32 bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-terminal-text-bright font-mono text-lg focus:border-terminal-green focus:outline-none"
                        />
                        <span className="text-terminal-text font-mono text-sm">EUR</span>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetInput(
                            f.monthlyTarget != null ? String(f.monthlyTarget) : ''
                          )
                          setEditingTarget(true)
                        }}
                        className="text-terminal-text-bright font-mono text-2xl font-bold hover:text-terminal-green transition-colors cursor-pointer"
                      >
                        {f.monthlyTarget != null
                          ? formatEuro(f.monthlyTarget)
                          : '[set target]'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar — only for current periods with a target set */}
                {!f.isPastPeriod &&
                  f.monthlyTarget != null &&
                  f.targetProgress != null && (() => {
                    let colorText = 'text-terminal-danger'
                    let colorBg = 'bg-terminal-danger'
                    let paceLabel = 'Behind Target'

                    if (f.forecastedMonthEnd >= f.monthlyTarget) {
                      colorText = 'text-terminal-green'
                      colorBg = 'bg-terminal-green'
                      paceLabel = 'On Track'
                    } else if (f.targetProgress >= 80) {
                      colorText = 'text-yellow-400'
                      colorBg = 'bg-yellow-400'
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
                        <div className="w-full h-2 bg-terminal-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colorBg} rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(f.targetProgress, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })()}
              </div>
            )
          })()}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            {/* Stacked bar chart */}
            <div className="lg:col-span-3 bg-terminal-bg-light border border-terminal-border rounded-lg p-4">
              <h2 className="text-terminal-text-bright font-mono text-sm font-bold mb-4">
                Revenue per Day
              </h2>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: CHART_TEXT, fontFamily: 'JetBrains Mono', fontSize: 12 }}
                      axisLine={{ stroke: CHART_GRID }}
                      tickLine={{ stroke: CHART_GRID }}
                    />
                    <YAxis
                      tick={{ fill: CHART_TEXT, fontFamily: 'JetBrains Mono', fontSize: 12 }}
                      axisLine={{ stroke: CHART_GRID }}
                      tickLine={{ stroke: CHART_GRID }}
                      unit="€"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#151b24',
                        border: `1px solid ${CHART_GREEN}`,
                        borderRadius: '6px',
                        color: '#e6e1dc',
                        fontFamily: 'JetBrains Mono',
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string, props: { payload?: Record<string, number> }) => {
                        const hours = props.payload?.[`_hours_${name}`] ?? 0
                        return [`${formatEuro(value)} (${hours}h)`, name]
                      }}
                    />
                    {allProjectNames.map((name, i) => (
                      <Bar
                        key={name}
                        dataKey={name}
                        stackId="revenue"
                        fill={projectColorMap[name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]}
                        radius={i === allProjectNames.length - 1 ? [3, 3, 0, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-terminal-text font-mono text-sm">No data for this period</p>
              )}
            </div>

            {/* Donut chart */}
            <div className="lg:col-span-2 bg-terminal-bg-light border border-terminal-border rounded-lg p-4">
              <h2 className="text-terminal-text-bright font-mono text-sm font-bold mb-4">
                Time by Project
              </h2>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={85}
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
                        border: `1px solid ${CHART_GREEN}`,
                        borderRadius: '6px',
                        color: '#e6e1dc',
                        fontFamily: 'JetBrains Mono',
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`${formatDecimalHours(value)}h`]}
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
                <p className="text-terminal-text font-mono text-sm">No data for this period</p>
              )}
            </div>
          </div>

          {/* Bottom row: Revenue + Top Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue */}
            <div className="bg-terminal-bg-light border border-terminal-border rounded-lg p-4">
              <h2 className="text-terminal-text-bright font-mono text-sm font-bold mb-4">
                Revenue
              </h2>
              <div className="flex gap-8 mb-4">
                <div>
                  <p className="text-terminal-text font-mono text-xs">This Month</p>
                  <p className="text-terminal-green font-mono text-xl font-bold">
                    {formatEuro(data.revenue.earnedThisMonth)}
                  </p>
                </div>
                <div>
                  <p className="text-terminal-text font-mono text-xs">Year to Date</p>
                  <p className="text-terminal-blue font-mono text-xl font-bold">
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
                    const colors = budgetStatus
                      ? budgetLevelColors(budgetStatus.level)
                      : { bar: 'bg-terminal-green', text: 'text-terminal-green' }
                    return (
                      <li key={p.projectId} className="font-mono text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-terminal-text-bright">{p.projectName}</span>
                          <span className={colors.text}>{formatEuro(p.earned)}</span>
                        </div>
                        <div className="w-full h-2 bg-terminal-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors.bar} rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        {p.budgetHours !== null && (
                          <div className="flex justify-between mt-0.5 text-xs text-terminal-text">
                            <span>{p.trackedHours.toFixed(1)}h tracked</span>
                            <span>{Math.max(p.budgetHours - p.trackedHours, 0).toFixed(1)}h remaining</span>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-terminal-text font-mono text-sm">No revenue data</p>
              )}
            </div>

            {/* Top Activities */}
            <div className="bg-terminal-bg-light border border-terminal-border rounded-lg p-4">
              <h2 className="text-terminal-text-bright font-mono text-sm font-bold mb-4">
                Top Activities
              </h2>
              {data.topDescriptions.length > 0 ? (
                <ol className="space-y-2">
                  {data.topDescriptions.map((item, i) => (
                    <li key={i} className="flex items-baseline gap-3 font-mono text-sm">
                      <span className="text-terminal-text w-5 text-right shrink-0">{i + 1}.</span>
                      <span className="text-terminal-text-bright truncate flex-1">
                        {item.description || '(no description)'}
                      </span>
                      <span className="text-terminal-green shrink-0">
                        {formatDecimalHours(item.minutes)}h
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-terminal-text font-mono text-sm">No activities recorded</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-terminal-bg-light border border-terminal-border rounded-lg p-4">
      <p className="text-terminal-text font-mono text-xs mb-1">{label}</p>
      <p className="text-terminal-green font-mono text-2xl font-bold truncate">{value}</p>
      {sub && <p className="text-terminal-text font-mono text-sm mt-0.5">{sub}</p>}
    </div>
  )
}
