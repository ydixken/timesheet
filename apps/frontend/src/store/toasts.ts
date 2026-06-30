import { create } from 'zustand'

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger'

export interface Toast {
  id: number
  title?: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => number
  dismiss: (id: number) => void
}

let nextId = 1

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],

  push: (t) => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts, { ...t, id }] }))
    setTimeout(() => get().dismiss(id), t.duration ?? 4000)
    return id
  },

  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

/** Imperative helper for non-component callers (hooks, stores). */
export function toast(t: Omit<Toast, 'id'>): number {
  return useToasts.getState().push(t)
}
