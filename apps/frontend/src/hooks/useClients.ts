import { create } from 'zustand'
import type { Client } from '@timesheet/shared'
import { api } from '../api/client'
import { toast } from '../store/toasts'

interface ClientsState {
  clients: Client[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
}

export const useClients = create<ClientsState>((set) => ({
  clients: [],
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const clients = await api.get<Client[]>('/clients')
      set({ clients, loading: false })
    } catch {
      set({ loading: false, error: 'Failed to load clients' })
      toast({ variant: 'danger', message: 'Failed to load clients' })
    }
  },
}))
