import { create } from 'zustand'
import type { BudgetThreshold, ProjectStatus } from '@timesheet/shared'
import { computeBudgetStatus } from '@timesheet/shared'
import { api } from '../api/client'
import { toast } from '../store/toasts'

interface BudgetAlertsState {
  shownThresholds: Map<string, Set<BudgetThreshold>>
  checkBudget: (projectId: string) => Promise<void>
}

export const useBudgetAlerts = create<BudgetAlertsState>((set, get) => ({
  shownThresholds: new Map(),

  checkBudget: async (projectId: string) => {
    try {
      const status = await api.get<ProjectStatus>(`/projects/${projectId}/status`)
      const budgetStatus = computeBudgetStatus(status.project.estimatedHours, status.totalMinutes)

      const previouslyShown = get().shownThresholds.get(projectId) ?? new Set<BudgetThreshold>()
      const newThresholds = budgetStatus.crossedThresholds.filter(
        (t) => !previouslyShown.has(t),
      )

      if (newThresholds.length === 0) return

      const allCrossed = new Set([...previouslyShown, ...budgetStatus.crossedThresholds])

      set((state) => {
        const updated = new Map(state.shownThresholds)
        updated.set(projectId, allCrossed)
        return { shownThresholds: updated }
      })

      toast({
        variant: budgetStatus.level === 'warning' ? 'warning' : 'danger',
        title: 'budget alert',
        message: `${status.project.name} at ${budgetStatus.percentage}% of budget`,
      })
    } catch {
      // silently ignore - budget check is non-critical
    }
  },
}))
