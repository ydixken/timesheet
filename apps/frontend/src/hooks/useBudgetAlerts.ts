import { create } from 'zustand'
import type { BudgetThreshold, BudgetLevel } from '@timesheet/shared'
import { computeBudgetStatus, BUDGET_THRESHOLDS } from '@timesheet/shared'
import type { ProjectStatus } from '@timesheet/shared'
import { api } from '../api/client'

export interface BudgetToastData {
  projectName: string
  projectColor: string
  percentage: number
  threshold: BudgetThreshold
  level: BudgetLevel
}

interface BudgetAlertsState {
  shownThresholds: Map<string, Set<BudgetThreshold>>
  toast: BudgetToastData | null
  checkBudget: (projectId: string) => Promise<void>
  dismissToast: () => void
}

export const useBudgetAlerts = create<BudgetAlertsState>((set, get) => ({
  shownThresholds: new Map(),
  toast: null,

  checkBudget: async (projectId: string) => {
    try {
      const status = await api.get<ProjectStatus>(`/projects/${projectId}/status`)
      const budgetStatus = computeBudgetStatus(status.project.estimatedHours, status.totalMinutes)

      const previouslyShown = get().shownThresholds.get(projectId) ?? new Set<BudgetThreshold>()
      const newThresholds = budgetStatus.crossedThresholds.filter(
        (t) => !previouslyShown.has(t),
      )

      if (newThresholds.length === 0) return

      const highest = newThresholds.reduce((max, t) => (t > max ? t : max))
      const allCrossed = new Set([...previouslyShown, ...budgetStatus.crossedThresholds])

      set((state) => {
        const updated = new Map(state.shownThresholds)
        updated.set(projectId, allCrossed)
        return {
          shownThresholds: updated,
          toast: {
            projectName: status.project.name,
            projectColor: status.project.color,
            percentage: budgetStatus.percentage!,
            threshold: highest,
            level: budgetStatus.level,
          },
        }
      })

      setTimeout(() => get().dismissToast(), 4000)
    } catch {
      // silently ignore - budget check is non-critical
    }
  },

  dismissToast: () => set({ toast: null }),
}))
