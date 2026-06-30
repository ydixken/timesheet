import { create } from 'zustand'
import type { CreateEntryInput, UpdateEntryInput } from '@timesheet/shared'
import type { EntryWithProject } from '../types'
import { api } from '../api/client'
import { toast } from '../store/toasts'

interface EntriesState {
  entries: EntryWithProject[]
  loading: boolean
  error: string | null
  fetch: (params?: { start?: string; end?: string; projectId?: string }) => Promise<void>
  create: (data: CreateEntryInput) => Promise<void>
  update: (id: string, data: UpdateEntryInput) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useEntries = create<EntriesState>((set, get) => ({
  entries: [],
  loading: false,
  error: null,
  fetch: async (params) => {
    set({ loading: true, error: null })
    try {
      const query = new URLSearchParams()
      if (params?.start) query.set('start', params.start)
      if (params?.end) query.set('end', params.end)
      if (params?.projectId) query.set('projectId', params.projectId)
      const qs = query.toString()
      const entries = await api.get<EntryWithProject[]>(`/entries${qs ? `?${qs}` : ''}`)
      set({ entries, loading: false })
    } catch {
      set({ loading: false, error: 'Failed to load entries' })
      toast({ variant: 'danger', message: 'Failed to load entries' })
    }
  },
  create: async (data) => {
    try {
      await api.post('/entries', data)
    } catch (e) {
      toast({ variant: 'danger', message: 'Failed to create entry' })
      throw e
    }
  },
  update: async (id, data) => {
    try {
      const updated = await api.put<EntryWithProject>(`/entries/${id}`, data)
      set({ entries: get().entries.map((e) => (e.id === id ? { ...e, ...updated } : e)) })
    } catch (e) {
      toast({ variant: 'danger', message: 'Failed to update entry' })
      throw e
    }
  },
  remove: async (id) => {
    try {
      await api.del(`/entries/${id}`)
      set({ entries: get().entries.filter((e) => e.id !== id) })
    } catch (e) {
      toast({ variant: 'danger', message: 'Failed to delete entry' })
      throw e
    }
  },
}))
