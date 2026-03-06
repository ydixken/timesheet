import { create } from 'zustand'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@timesheet/shared'
import { api } from '../api/client'

interface TasksState {
  tasks: Task[]
  loading: boolean
  fetch: (projectId: string) => Promise<void>
  create: (data: CreateTaskInput) => Promise<void>
  update: (id: string, data: UpdateTaskInput) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useTasks = create<TasksState>((set) => ({
  tasks: [],
  loading: false,
  fetch: async (projectId: string) => {
    set({ loading: true })
    try {
      const tasks = await api.get<Task[]>(`/tasks?projectId=${projectId}`)
      set({ tasks, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  create: async (data: CreateTaskInput) => {
    const task = await api.post<Task>('/tasks', data)
    set((s) => ({ tasks: [...s.tasks, task] }))
  },
  update: async (id: string, data: UpdateTaskInput) => {
    const updated = await api.put<Task>(`/tasks/${id}`, data)
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }))
  },
  remove: async (id: string) => {
    await api.del(`/tasks/${id}`)
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },
}))
