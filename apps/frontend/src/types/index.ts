import type { TimeEntry } from '@timesheet/shared'

export type EntryWithProject = TimeEntry & {
  project: { id: string; name: string; color: string; clientId: string | null } | null
  client: { id: string; name: string } | null
}
