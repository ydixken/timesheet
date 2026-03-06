import { useState, useEffect, useCallback } from 'react'
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
import { api } from '../api/client'
import { formatDecimalHours } from '../lib/time'

type Range = 'this_week' | 'last_week' | 'this_month' | 'last_month'

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
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
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

export function Dashboard() {
  const [range, setRange] = useState<Range>('this_week')
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          row[p.projectName] = +(p.minutes / 60).toFixed(2)
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
        $ dashboard
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

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            {/* Stacked bar chart */}
            <div className="lg:col-span-3 bg-terminal-bg-light border border-terminal-border rounded-lg p-4">
              <h2 className="text-terminal-text-bright font-mono text-sm font-bold mb-4">
                Hours per Day
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
                      unit="h"
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
                      formatter={(value: number) => [`${value}h`, undefined]}
                    />
                    {allProjectNames.map((name, i) => (
                      <Bar
                        key={name}
                        dataKey={name}
                        stackId="hours"
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
                    return (
                      <li key={p.projectId} className="font-mono text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="text-terminal-text-bright">{p.projectName}</span>
                          <span className="text-terminal-green">{formatEuro(p.earned)}</span>
                        </div>
                        <div className="w-full h-2 bg-terminal-surface rounded-full overflow-hidden">
                          <div
                            className="h-full bg-terminal-green rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        {p.budgetHours !== null && (
                          <div className="flex justify-between mt-0.5 text-xs text-terminal-text">
                            <span>{p.trackedHours.toFixed(1)}h tracked</span>
                            <span>{p.budgetHours}h budget</span>
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
