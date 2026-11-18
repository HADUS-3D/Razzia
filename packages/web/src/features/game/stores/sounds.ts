import { create } from "zustand"
import type { ResolvedSounds } from "@razzia/common/types/game"

interface SoundsStore {
  /** Sounds chosen for the running game; empty means the defaults. */
  sounds: ResolvedSounds
  setSounds: (_sounds: ResolvedSounds | undefined) => void
}

export const useSoundsStore = create<SoundsStore>((set) => ({
  sounds: {},
  setSounds: (sounds) => set({ sounds: sounds ?? {} }),
}))
