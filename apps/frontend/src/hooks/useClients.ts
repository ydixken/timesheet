import { create } from 'zustand'
import type { Client } from '@timesheet/shared'
import { api } from '../api/client'

interface ClientsState {
  clients: Client[]
  loading: boolean
  fetch: () => Promise<void>
}

export const useClients = create<ClientsState>((set) => ({
  clients: [],
  loading: false,
  fetch: async () => {
    set({ loading: true })
    try {
      const clients = await api.get<Client[]>('/clients')
      set({ clients, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
