export interface DailySeries {
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
}

export interface DashboardResponse {
  totalMinutes: number
  topProject: { name: string; minutes: number } | null
  topClient: { name: string; minutes: number } | null
  dailySeries: DailySeries[]
  projectSplit: ProjectSplit[]
  topDescriptions: { description: string; minutes: number }[]
  revenue: RevenueSummary
}
