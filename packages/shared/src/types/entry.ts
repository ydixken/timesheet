export interface TimeEntry {
  id: string
  projectId: string
  taskId: string | null
  description: string
  date: string
  startTime: string | null
  endTime: string | null
  durationMin: number
  billable: boolean
  createdAt: string
  updatedAt: string
}
