export type ChartGranularity = 'day' | 'week'

export interface SeriesBucket {
  /** Bucket start as YYYY-MM-DD: the day itself, or the Monday of the ISO week. */
  date: string
  totalMinutes: number
  projects: { projectId: string; projectName: string; color: string; minutes: number; hourlyRate: number }[]
}

export interface ProjectSplit {
  projectId: string
  projectName: string
  color: string
  totalMinutes: number
  percentage: number
}

export type ForecastMode = 'month_forecast' | 'year_forecast' | 'summary'

export interface RevenueForecast {
  /** Which display mode the card should render. */
  mode: ForecastMode
  /** Human-readable label for the selected range, e.g. "Last 3 Months", "This Year". */
  periodLabel: string

  /** Working days in the forecast scope (month/year) or in the selected period (summary). */
  workingDaysTotal: number
  workingDaysElapsed: number
  /** Revenue per working day (over elapsed days for forecasts, over the whole period for summary). */
  avgDailyRevenue: number

  // --- forecast modes (month_forecast | year_forecast) ---
  /** Projected end-of-month or end-of-year revenue (equals periodRevenue in summary mode). */
  forecastValue: number
  /** Earned so far that feeds the projection: earnedThisMonth (month) or earnedYTD (year). */
  earnedToDate: number
  /** Target for the active scope: monthly target (month) or annual target = monthly × 12 (year). */
  target: number | null
  /** Percent of `target` achieved by `earnedToDate`. */
  targetProgress: number | null
  /** Raw monthly target from settings — drives the inline editor in month mode. */
  monthlyTarget: number | null

  // --- summary mode ---
  /** Actual billable revenue across the selected range. */
  periodRevenue: number
  /** periodRevenue / monthsInPeriod. */
  avgMonthlyRevenue: number
  /** Inclusive calendar-month span of the selected range. */
  monthsInPeriod: number
}

export interface RevenueSummary {
  earnedThisMonth: number
  earnedYTD: number
  projects: {
    projectId: string
    projectName: string
    earned: number
    budgetHours: number | null
    trackedHours: number
    remainingHours: number | null
  }[]
  forecast: RevenueForecast
}

export interface DashboardResponse {
  totalMinutes: number
  topProject: { name: string; minutes: number } | null
  topClient: { name: string; minutes: number } | null
  /** Time series for the bar chart, bucketed by `granularity`. */
  series: SeriesBucket[]
  granularity: ChartGranularity
  /** Range span (in months) above which the chart switches from daily to weekly buckets. */
  chartWeekThresholdMonths: number
  projectSplit: ProjectSplit[]
  topDescriptions: { description: string; minutes: number }[]
  revenue: RevenueSummary
}
