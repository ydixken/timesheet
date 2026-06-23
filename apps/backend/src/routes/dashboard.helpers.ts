import type { ChartGranularity, RevenueForecast } from '@timesheet/shared'

export const round2 = (n: number): number => Math.round(n * 100) / 100

export function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Resolve a named range (or an explicit custom window) to inclusive YYYY-MM-DD bounds. */
export function getDateRange(range: string, start?: string, end?: string): { start: string; end: string } {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = today.getMonth()
  const dd = today.getDate()

  switch (range) {
    case 'this_week': {
      const day = today.getDay() || 7 // Sunday=0 -> 7
      const monday = new Date(yyyy, mm, dd - day + 1)
      return { start: fmtDate(monday), end: fmtDate(today) }
    }
    case 'last_week': {
      const day = today.getDay() || 7
      const thisMonday = new Date(yyyy, mm, dd - day + 1)
      const lastMonday = new Date(thisMonday)
      lastMonday.setDate(thisMonday.getDate() - 7)
      const lastSunday = new Date(lastMonday)
      lastSunday.setDate(lastMonday.getDate() + 6)
      return { start: fmtDate(lastMonday), end: fmtDate(lastSunday) }
    }
    case 'this_month':
      return { start: `${yyyy}-${pad(mm + 1)}-01`, end: fmtDate(today) }
    case 'last_month': {
      const first = new Date(yyyy, mm - 1, 1)
      const last = new Date(yyyy, mm, 0)
      return { start: fmtDate(first), end: fmtDate(last) }
    }
    case 'today':
      return { start: fmtDate(today), end: fmtDate(today) }
    case 'last_3_months': {
      const first3 = new Date(yyyy, mm - 2, 1)
      return { start: fmtDate(first3), end: fmtDate(today) }
    }
    case 'last_6_months': {
      const first6 = new Date(yyyy, mm - 5, 1)
      return { start: fmtDate(first6), end: fmtDate(today) }
    }
    case 'current_year':
      return { start: `${yyyy}-01-01`, end: fmtDate(today) }
    case 'custom':
      if (start && end) return { start, end }
      return { start: fmtDate(today), end: fmtDate(today) }
    default:
      return { start: `${yyyy}-${pad(mm + 1)}-01`, end: fmtDate(today) }
  }
}

/** Count Mon–Fri in a calendar month, optionally only up to (and including) `upToDay`. */
export function countWorkingDays(year: number, month: number, upToDay?: number): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  const limit = upToDay !== undefined ? Math.min(upToDay, daysInMonth) : daysInMonth
  let count = 0
  for (let d = 1; d <= limit; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow >= 1 && dow <= 5) count++
  }
  return count
}

/** Count Mon–Fri between two dates, inclusive. */
export function countWorkingDaysBetween(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow >= 1 && dow <= 5) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export type ForecastScope = 'month' | 'year' | 'summary'

/** Today/This Week/This Month project the current month; This Year projects the year; the rest are actuals. */
export function getForecastMode(range: string): ForecastScope {
  if (range === 'today' || range === 'this_week' || range === 'this_month') return 'month'
  if (range === 'current_year') return 'year'
  return 'summary'
}

/** Inclusive calendar-month span of a YYYY-MM-DD window (e.g. Apr→Jun = 3). */
export function monthsBetweenInclusive(startStr: string, endStr: string): number {
  const s = new Date(startStr + 'T12:00:00')
  const e = new Date(endStr + 'T12:00:00')
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
}

/** Monday (YYYY-MM-DD) of the ISO week containing `dateStr`. Noon-guarded to avoid TZ drift. */
export function weekStartStr(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() || 7 // Sunday=0 -> 7
  d.setDate(d.getDate() - (day - 1))
  return fmtDate(d)
}

/** Daily bars for short ranges; weekly once the span exceeds the threshold (in months). */
export function pickGranularity(monthsInPeriod: number, thresholdMonths: number): ChartGranularity {
  return monthsInPeriod > thresholdMonths ? 'week' : 'day'
}

/** Single source of truth for the human-readable label of each range. */
export const RANGE_LABELS: Record<string, string> = {
  today: 'Today',
  this_week: 'This Week',
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  last_6_months: 'Last 6 Months',
  current_year: 'This Year',
  custom: 'Custom Range',
}

export interface ForecastInputs {
  mode: ForecastScope
  periodLabel: string
  monthlyTarget: number | null
  monthsInPeriod: number
  /** Billable revenue inside the selected range. */
  periodRevenue: number
  /** Mon–Fri count inside the selected range. */
  periodWorkingDays: number
  /** Billable revenue for the current calendar month, used by the month projection. */
  earnedThisMonth: number
  /** Billable revenue year-to-date, used by the year projection. */
  earnedYTD: number
  monthWorkingDaysTotal: number
  monthWorkingDaysElapsed: number
  yearWorkingDaysTotal: number
  yearWorkingDaysElapsed: number
}

/**
 * Pure revenue-card builder. `month` projects the current month-end, `year` projects the
 * current year-end (annual target = monthly × 12), and `summary` reports the actual period
 * totals (no projection) plus per-month / per-working-day averages.
 */
export function buildForecast(i: ForecastInputs): RevenueForecast {
  const base = {
    periodLabel: i.periodLabel,
    monthlyTarget: i.monthlyTarget,
    periodRevenue: round2(i.periodRevenue),
    monthsInPeriod: i.monthsInPeriod,
  }

  if (i.mode === 'month') {
    const avgDailyRevenue = i.monthWorkingDaysElapsed > 0 ? i.earnedThisMonth / i.monthWorkingDaysElapsed : 0
    const forecastValue = avgDailyRevenue * i.monthWorkingDaysTotal
    const target = i.monthlyTarget
    const targetProgress = target != null && target > 0 ? (i.earnedThisMonth / target) * 100 : null
    return {
      mode: 'month_forecast',
      ...base,
      workingDaysTotal: i.monthWorkingDaysTotal,
      workingDaysElapsed: i.monthWorkingDaysElapsed,
      avgDailyRevenue: round2(avgDailyRevenue),
      forecastValue: round2(forecastValue),
      earnedToDate: round2(i.earnedThisMonth),
      target: target != null ? round2(target) : null,
      targetProgress: targetProgress != null ? round2(targetProgress) : null,
      avgMonthlyRevenue: 0,
    }
  }

  if (i.mode === 'year') {
    const avgDailyRevenue = i.yearWorkingDaysElapsed > 0 ? i.earnedYTD / i.yearWorkingDaysElapsed : 0
    const forecastValue = avgDailyRevenue * i.yearWorkingDaysTotal
    const target = i.monthlyTarget != null ? i.monthlyTarget * 12 : null
    const targetProgress = target != null && target > 0 ? (i.earnedYTD / target) * 100 : null
    return {
      mode: 'year_forecast',
      ...base,
      workingDaysTotal: i.yearWorkingDaysTotal,
      workingDaysElapsed: i.yearWorkingDaysElapsed,
      avgDailyRevenue: round2(avgDailyRevenue),
      forecastValue: round2(forecastValue),
      earnedToDate: round2(i.earnedYTD),
      target: target != null ? round2(target) : null,
      targetProgress: targetProgress != null ? round2(targetProgress) : null,
      avgMonthlyRevenue: 0,
    }
  }

  // summary: actual totals for the selected period, no projection
  const avgDailyRevenue = i.periodWorkingDays > 0 ? i.periodRevenue / i.periodWorkingDays : 0
  const avgMonthlyRevenue = i.monthsInPeriod > 0 ? i.periodRevenue / i.monthsInPeriod : 0
  return {
    mode: 'summary',
    ...base,
    workingDaysTotal: i.periodWorkingDays,
    workingDaysElapsed: i.periodWorkingDays,
    avgDailyRevenue: round2(avgDailyRevenue),
    forecastValue: round2(i.periodRevenue),
    earnedToDate: round2(i.periodRevenue),
    target: null,
    targetProgress: null,
    avgMonthlyRevenue: round2(avgMonthlyRevenue),
  }
}
