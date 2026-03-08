import { create } from 'zustand'
import type { CreateEntryInput, UpdateEntryInput } from '@timesheet/shared'
import type { EntryWithProject } from '../types'
import { api } from '../api/client'

interface EntriesState {
  entries: EntryWithProject[]
  loading: boolean
  fetch: (params?: { start?: string; end?: string; projectId?: string }) => Promise<void>
  create: (data: CreateEntryInput) => Promise<void>
  update: (id: string, data: UpdateEntryInput) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useEntries = create<EntriesState>((set, get) => ({
  entries: [],
  loading: false,
  fetch: async (params) => {
    set({ loading: true })
    try {
      const query = new URLSearchParams()
      if (params?.start) query.set('start', params.start)
      if (params?.end) query.set('end', params.end)
      if (params?.projectId) query.set('projectId', params.projectId)
      const qs = query.toString()
      const entries = await api.get<EntryWithProject[]>(`/entries${qs ? `?${qs}` : ''}`)
      set({ entries, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  create: async (data) => {
    await api.post('/entries', data)
  },
  update: async (id, data) => {
    const updated = await api.put<EntryWithProject>(`/entries/${id}`, data)
    set({ entries: get().entries.map((e) => (e.id === id ? { ...e, ...updated } : e)) })
  },
  remove: async (id) => {
    await api.del(`/entries/${id}`)
    set({ entries: get().entries.filter((e) => e.id !== id) })
  },
}))
