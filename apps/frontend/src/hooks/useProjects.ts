import { create } from 'zustand'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@timesheet/shared'
import { api } from '../api/client'

interface ProjectsState {
  projects: Project[]
  loading: boolean
  fetch: (filter?: 'all' | 'active' | 'archived') => Promise<void>
  create: (data: CreateProjectInput) => Promise<Project>
  update: (id: string, data: UpdateProjectInput) => Promise<Project>
  remove: (id: string) => Promise<void>
}

export const useProjects = create<ProjectsState>((set) => ({
  projects: [],
  loading: false,
  fetch: async (filter = 'active') => {
    set({ loading: true })
    try {
      const query = filter === 'all' ? '' : `?active=${filter === 'active'}`
      const projects = await api.get<Project[]>(`/projects${query}`)
      set({ projects, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  create: async (data: CreateProjectInput) => {
    const project = await api.post<Project>('/projects', data)
    set((s) => ({ projects: [...s.projects, project] }))
    return project
  },
  update: async (id: string, data: UpdateProjectInput) => {
    const updated = await api.put<Project>(`/projects/${id}`, data)
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? updated : p)) }))
    return updated
  },
  remove: async (id: string) => {
    await api.del(`/projects/${id}`)
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
  },
}))
