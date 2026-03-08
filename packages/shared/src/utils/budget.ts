export const BUDGET_THRESHOLDS = [80, 90, 100] as const
export type BudgetThreshold = (typeof BUDGET_THRESHOLDS)[number]
export type BudgetLevel = 'ok' | 'warning' | 'danger' | 'exceeded'

export interface BudgetStatus {
  budgetHours: number | null
  trackedHours: number
  percentage: number | null
  level: BudgetLevel
  remainingHours: number | null
  crossedThresholds: BudgetThreshold[]
}

export function computeBudgetStatus(
  estimatedHours: string | null,
  totalMinutes: number,
): BudgetStatus {
  const trackedHours = Math.round((totalMinutes / 60) * 100) / 100

  if (estimatedHours === null || estimatedHours === '') {
    return {
      budgetHours: null,
      trackedHours,
      percentage: null,
      level: 'ok',
      remainingHours: null,
      crossedThresholds: [],
    }
  }

  const budgetHours = parseFloat(estimatedHours)

  if (budgetHours <= 0 || isNaN(budgetHours)) {
    return {
      budgetHours: null,
      trackedHours,
      percentage: null,
      level: 'ok',
      remainingHours: null,
      crossedThresholds: [],
    }
  }

  const percentage =
    Math.round((trackedHours / budgetHours) * 100 * 100) / 100
  const remainingHours =
    Math.round(Math.max(budgetHours - trackedHours, 0) * 100) / 100
  const crossedThresholds = BUDGET_THRESHOLDS.filter((t) => percentage >= t)

  let level: BudgetLevel
  if (percentage >= 100) {
    level = 'exceeded'
  } else if (percentage >= 90) {
    level = 'danger'
  } else if (percentage >= 80) {
    level = 'warning'
  } else {
    level = 'ok'
  }

  return {
    budgetHours,
    trackedHours,
    percentage,
    level,
    remainingHours,
    crossedThresholds,
  }
}

export function budgetLevelColors(level: BudgetLevel): {
  bar: string
  text: string
} {
  switch (level) {
    case 'ok':
      return { bar: 'bg-terminal-green', text: 'text-terminal-green' }
    case 'warning':
      return { bar: 'bg-terminal-warning', text: 'text-terminal-warning' }
    case 'danger':
    case 'exceeded':
      return { bar: 'bg-terminal-danger', text: 'text-terminal-danger' }
  }
}
