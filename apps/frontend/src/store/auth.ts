import { create } from 'zustand'
import type { User } from '@timesheet/shared'
import { api } from '../api/client'

interface AuthState {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  login: async (username, password) => {
    const { user } = await api.post<{ user: User }>('/auth/login', { username, password })
    set({ user })
  },
  logout: async () => {
    await api.post('/auth/logout', {})
    set({ user: null })
  },
  checkAuth: async () => {
    try {
      const { user } = await api.get<{ user: User }>('/auth/me')
      set({ user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
}))
