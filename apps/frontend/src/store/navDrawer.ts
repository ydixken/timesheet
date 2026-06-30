import { create } from 'zustand'

/** Mobile nav drawer visibility. Mirrors the useCommandPalette store style. */
export const useNavDrawer = create<{
  open: boolean
  toggle: () => void
  close: () => void
  openDrawer: () => void
}>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
  openDrawer: () => set({ open: true }),
}))
