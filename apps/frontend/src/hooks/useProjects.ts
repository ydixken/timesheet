import { create } from 'zustand'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@timesheet/shared'
import { api } from '../api/client'
import { toast } from '../store/toasts'

interface ProjectsState {
  projects: Project[]
  loading: boolean
  error: string | null
  fetch: (filter?: 'all' | 'active' | 'archived') => Promise<void>
  create: (data: CreateProjectInput) => Promise<Project>
  update: (id: string, data: UpdateProjectInput) => Promise<Project>
  remove: (id: string) => Promise<void>
}

export const useProjects = create<ProjectsState>((set) => ({
  projects: [],
  loading: false,
  error: null,
  fetch: async (filter = 'active') => {
    set({ loading: true, error: null })
    try {
      const query = filter === 'all' ? '' : `?active=${filter === 'active'}`
      const projects = await api.get<Project[]>(`/projects${query}`)
      set({ projects, loading: false })
    } catch {
      set({ loading: false, error: 'Failed to load projects' })
      toast({ variant: 'danger', message: 'Failed to load projects' })
    }
  },
  create: async (data: CreateProjectInput) => {
    try {
      const project = await api.post<Project>('/projects', data)
      set((s) => ({ projects: [...s.projects, project] }))
      return project
    } catch (e) {
      toast({ variant: 'danger', message: 'Failed to create project' })
      throw e
    }
  },
  update: async (id: string, data: UpdateProjectInput) => {
    try {
      const updated = await api.put<Project>(`/projects/${id}`, data)
      set((s) => ({ projects: s.projects.map((p) => (p.id === id ? updated : p)) }))
      return updated
    } catch (e) {
      toast({ variant: 'danger', message: 'Failed to update project' })
      throw e
    }
  },
  remove: async (id: string) => {
    try {
      await api.del(`/projects/${id}`)
      set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
    } catch (e) {
      toast({ variant: 'danger', message: 'Failed to delete project' })
      throw e
    }
  },
}))
