import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  currentGrade: number
  isParentMode: boolean
  soundEnabled: boolean
  setGrade: (g: number) => void
  setParentMode: (v: boolean) => void
  toggleSound: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      currentGrade: 1,
      isParentMode: false,
      soundEnabled: true,
      setGrade: (g) => set({ currentGrade: g }),
      setParentMode: (v) => set({ isParentMode: v }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled }))
    }),
    { name: 'english-star-app' }
  )
)
