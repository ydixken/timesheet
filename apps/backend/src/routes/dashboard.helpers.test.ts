import { describe, it, expect } from 'vitest'
import {
  fmtDate,
  getDateRange,
  countWorkingDays,
  countWorkingDaysBetween,
  getForecastMode,
  monthsBetweenInclusive,
  weekStartStr,
  pickGranularity,
  buildForecast,
  RANGE_LABELS,
} from './dashboard.helpers.js'
import type { ForecastInputs } from './dashboard.helpers.js'

const noon = (s: string) => new Date(s + 'T12:00:00')

describe('getForecastMode', () => {
  it('maps current-month ranges to "month"', () => {
    expect(getForecastMode('today')).toBe('month')
    expect(getForecastMode('this_week')).toBe('month')
    expect(getForecastMode('this_month')).toBe('month')
  })
  it('maps current_year to "year"', () => {
    expect(getForecastMode('current_year')).toBe('year')
  })
  it('maps historical / multi-month / custom ranges to "summary"', () => {
    for (const r of ['last_week', 'last_month', 'last_3_months', 'last_6_months', 'custom']) {
      expect(getForecastMode(r)).toBe('summary')
    }
  })
  it('falls back to "summary" for unknown ranges', () => {
    expect(getForecastMode('whatever')).toBe('summary')
  })
})

describe('getDateRange', () => {
  it('returns the explicit window for a custom range', () => {
    expect(getDateRange('custom', '2026-02-10', '2026-04-15')).toEqual({
      start: '2026-02-10',
      end: '2026-04-15',
    })
  })
  it('falls back to today/today for custom without bounds', () => {
    const today = fmtDate(new Date())
    expect(getDateRange('custom')).toEqual({ start: today, end: today })
  })
  it('current_year spans Jan 1 of this year to today', () => {
    const now = new Date()
    expect(getDateRange('current_year')).toEqual({
      start: `${now.getFullYear()}-01-01`,
      end: fmtDate(now),
    })
  })
  it('today is a single-day window', () => {
    const today = fmtDate(new Date())
    expect(getDateRange('today')).toEqual({ start: today, end: today })
  })
})

describe('monthsBetweenInclusive', () => {
  it('counts a single month as 1', () => {
    expect(monthsBetweenInclusive('2026-06-01', '2026-06-23')).toBe(1)
  })
  it('counts last-3-months style windows as 3', () => {
    expect(monthsBetweenInclusive('2026-04-01', '2026-06-23')).toBe(3)
  })
  it('counts year-to-date style windows', () => {
    expect(monthsBetweenInclusive('2026-01-01', '2026-06-23')).toBe(6)
  })
  it('handles cross-year spans', () => {
    expect(monthsBetweenInclusive('2025-12-15', '2026-01-05')).toBe(2)
    expect(monthsBetweenInclusive('2024-01-01', '2026-01-01')).toBe(25)
  })
})

describe('weekStartStr', () => {
  it('maps a Monday to itself', () => {
    expect(weekStartStr('2024-01-01')).toBe('2024-01-01') // Mon
    expect(weekStartStr('2024-01-08')).toBe('2024-01-08') // next Mon
  })
  it('maps mid-week and Sunday back to the same Monday', () => {
    expect(weekStartStr('2024-01-03')).toBe('2024-01-01') // Wed
    expect(weekStartStr('2024-01-07')).toBe('2024-01-01') // Sun
  })
  it('crosses month + leap-year boundaries correctly', () => {
    expect(weekStartStr('2024-03-01')).toBe('2024-02-26') // Fri -> prior Mon (leap Feb)
  })
})

describe('pickGranularity', () => {
  it('uses daily buckets at or below the threshold', () => {
    expect(pickGranularity(1, 2)).toBe('day')
    expect(pickGranularity(2, 2)).toBe('day')
  })
  it('switches to weekly buckets above the threshold', () => {
    expect(pickGranularity(3, 2)).toBe('week')
    expect(pickGranularity(6, 2)).toBe('week')
    expect(pickGranularity(2, 1)).toBe('week')
  })
})

describe('countWorkingDays', () => {
  it('counts Mon–Fri across a full month', () => {
    expect(countWorkingDays(2024, 1)).toBe(23) // Jan 2024
    expect(countWorkingDays(2024, 2)).toBe(21) // Feb 2024 (leap)
  })
  it('respects the upToDay limit', () => {
    expect(countWorkingDays(2024, 1, 5)).toBe(5) // Mon–Fri Jan 1–5
  })
})

describe('countWorkingDaysBetween', () => {
  it('counts inclusive Mon–Fri spans', () => {
    expect(countWorkingDaysBetween(noon('2024-01-01'), noon('2024-01-05'))).toBe(5)
  })
  it('excludes weekends', () => {
    expect(countWorkingDaysBetween(noon('2024-01-01'), noon('2024-01-07'))).toBe(5)
    expect(countWorkingDaysBetween(noon('2024-01-06'), noon('2024-01-07'))).toBe(0)
  })
})

describe('RANGE_LABELS', () => {
  it('labels every supported range', () => {
    expect(RANGE_LABELS.current_year).toBe('This Year')
    expect(RANGE_LABELS.last_3_months).toBe('Last 3 Months')
    expect(RANGE_LABELS.custom).toBe('Custom Range')
  })
})

describe('buildForecast', () => {
  const base: ForecastInputs = {
    mode: 'summary',
    periodLabel: 'Test',
    monthlyTarget: null,
    monthsInPeriod: 1,
    periodRevenue: 0,
    periodWorkingDays: 0,
    earnedThisMonth: 0,
    earnedYTD: 0,
    monthWorkingDaysTotal: 0,
    monthWorkingDaysElapsed: 0,
    yearWorkingDaysTotal: 0,
    yearWorkingDaysElapsed: 0,
  }

  it('month mode projects the current month-end from the elapsed run-rate', () => {
    const f = buildForecast({
      ...base,
      mode: 'month',
      periodLabel: 'This Month',
      earnedThisMonth: 1000,
      monthWorkingDaysElapsed: 10,
      monthWorkingDaysTotal: 20,
      monthlyTarget: 3000,
    })
    expect(f.mode).toBe('month_forecast')
    expect(f.avgDailyRevenue).toBe(100) // 1000 / 10
    expect(f.forecastValue).toBe(2000) // 100 * 20
    expect(f.earnedToDate).toBe(1000)
    expect(f.target).toBe(3000)
    expect(f.targetProgress).toBe(33.33) // 1000 / 3000
  })

  it('year mode projects the year-end and uses an annual target of monthly × 12', () => {
    const f = buildForecast({
      ...base,
      mode: 'year',
      periodLabel: 'This Year',
      earnedYTD: 60000,
      yearWorkingDaysElapsed: 120,
      yearWorkingDaysTotal: 250,
      monthlyTarget: 5000,
    })
    expect(f.mode).toBe('year_forecast')
    expect(f.avgDailyRevenue).toBe(500) // 60000 / 120
    expect(f.forecastValue).toBe(125000) // 500 * 250
    expect(f.earnedToDate).toBe(60000)
    expect(f.target).toBe(60000) // 5000 * 12
    expect(f.targetProgress).toBe(100)
  })

  it('year mode leaves the target null when no monthly target is set', () => {
    const f = buildForecast({ ...base, mode: 'year', earnedYTD: 1000, yearWorkingDaysElapsed: 10, yearWorkingDaysTotal: 250 })
    expect(f.target).toBeNull()
    expect(f.targetProgress).toBeNull()
  })

  it('summary mode reports the actual period total (no projection) plus averages', () => {
    // Matches the documented example: €18,750 over 3 months / 63 working days
    const f = buildForecast({
      ...base,
      mode: 'summary',
      periodLabel: 'Last 3 Months',
      periodRevenue: 18750,
      periodWorkingDays: 63,
      monthsInPeriod: 3,
    })
    expect(f.mode).toBe('summary')
    expect(f.forecastValue).toBe(18750) // actual total, NOT a forecast
    expect(f.periodRevenue).toBe(18750)
    expect(f.avgMonthlyRevenue).toBe(6250) // 18750 / 3
    expect(f.avgDailyRevenue).toBe(297.62) // 18750 / 63
    expect(f.target).toBeNull()
    expect(f.targetProgress).toBeNull()
  })

  it('guards against divide-by-zero on empty periods', () => {
    const f = buildForecast({ ...base, mode: 'summary', periodRevenue: 0, periodWorkingDays: 0, monthsInPeriod: 1 })
    expect(f.avgDailyRevenue).toBe(0)
    expect(f.avgMonthlyRevenue).toBe(0)
    expect(f.forecastValue).toBe(0)
  })
})
