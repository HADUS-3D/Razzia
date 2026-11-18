import useSound from "use-sound"
import type { ResolvedSounds } from "@razzia/common/types/game"
import { SOUND_LIBRARY_PREFIX, SOUND_NONE } from "@razzia/common/constants"
import { useSoundsStore } from "@razzia/web/features/game/stores/sounds"

export const SOUND_SLOTS = [
  "music",
  "answerEnd",
  "leaderboard",
  "podium",
] as const

export type SoundSlot = (typeof SOUND_SLOTS)[number]

/** The sounds that ship with the app: every mp3 in assets/sounds/music and assets/sounds/sfx. */
const files = import.meta.glob("../../../assets/sounds/*/*.mp3", {
  query: "?url",
  import: "default",
  eager: true,
}) satisfies Record<string, unknown>

interface LibrarySound {
  id: string
  url: string
}

const bundled: LibrarySound[] = Object.entries(files).flatMap(([path, url]) => {
  const match = /\/(music|sfx)\/([^/]+)\.mp3$/u.exec(path)

  return match
    ? [
        {
          id: `${SOUND_LIBRARY_PREFIX}${match[1]}/${match[2]}`,
          url: String(url),
        },
      ]
    : []
})

/** The sounds the app played before they were configurable. They stay selectable. */
export const DEFAULT_SOUNDS: Record<SoundSlot, LibrarySound | null> = {
  music: {
    id: `${SOUND_LIBRARY_PREFIX}default/music`,
    url: "/sounds/answersMusic.mp3",
  },
  answerEnd: {
    id: `${SOUND_LIBRARY_PREFIX}default/answerEnd`,
    url: "/sounds/results.mp3",
  },
  leaderboard: null,
  podium: {
    id: `${SOUND_LIBRARY_PREFIX}default/podium`,
    url: "/sounds/first.mp3",
  },
}

/** Which of the bundled sounds belong to a slot: music, or sfx by file name prefix. */
const SFX_PREFIX: Record<Exclude<SoundSlot, "music">, string> = {
  answerEnd: "end",
  leaderboard: "leader",
  podium: "podium",
}

export const librarySoundsFor = (slot: SoundSlot): LibrarySound[] => {
  const own = bundled.filter(({ id }) =>
    slot === "music"
      ? id.startsWith(`${SOUND_LIBRARY_PREFIX}music/`)
      : id.startsWith(`${SOUND_LIBRARY_PREFIX}sfx/${SFX_PREFIX[slot]}`),
  )
  const fallback = DEFAULT_SOUNDS[slot]

  return fallback ? [fallback, ...own] : own
}

/** The URL to play for a chosen value, or null for silence. Unset means the default. */
export const soundUrl = (
  slot: SoundSlot,
  value: string | undefined,
): string | null => {
  if (value === SOUND_NONE) {
    return null
  }

  if (value === undefined) {
    return DEFAULT_SOUNDS[slot]?.url ?? null
  }

  if (value.startsWith(SOUND_LIBRARY_PREFIX)) {
    const found = [...bundled, ...Object.values(DEFAULT_SOUNDS)].find(
      (sound) => sound?.id === value,
    )

    return found?.url ?? DEFAULT_SOUNDS[slot]?.url ?? null
  }

  return value
}

/** A readable name for a library sound: "lib:sfx/end1" becomes "end1". */
export const soundName = (id: string): string =>
  id.slice(id.lastIndexOf("/") + 1)

const BASE_VOLUME: Record<SoundSlot, number> = {
  music: 0.2,
  answerEnd: 0.2,
  leaderboard: 0.3,
  podium: 0.1,
}

/**
 * A configurable sound of the running game: the chosen file, or the default,
 * at the volume of the app settings. `play` does nothing when it is silent.
 */
export const useGameSound = (slot: SoundSlot, loop = false) => {
  const sounds: ResolvedSounds = useSoundsStore((state) => state.sounds)
  const url = soundUrl(slot, sounds[slot])
  const volume = BASE_VOLUME[slot] * ((sounds.volume ?? 100) / 100)

  const [play, { stop }] = useSound(url ?? DEFAULT_SOUNDS.music?.url ?? "", {
    volume,
    loop,
    interrupt: loop,
    soundEnabled: url !== null,
  })

  return { play, stop, silent: url === null }
}
