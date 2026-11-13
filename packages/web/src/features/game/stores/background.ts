import { create } from "zustand"

interface BackgroundStore {
  /** Background chosen for the running game, if any. */
  background: string | undefined
  setBackground: (_background: string | undefined) => void
}

export const useBackgroundStore = create<BackgroundStore>((set) => ({
  background: undefined,
  setBackground: (background) => set({ background }),
}))
