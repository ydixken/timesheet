export interface Project {
  id: string
  clientId: string | null
  name: string
  color: string
  hourlyRate: string | null
  estimatedHours: string | null
  billable: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ProjectStatus {
  project: Project
  totalMinutes: number
  billableMinutes: number
  nonBillableMinutes: number
  remainingHours: number | null
  earnedAmount: number | null
  tasks: { id: string; name: string; totalMinutes: number }[]
}
