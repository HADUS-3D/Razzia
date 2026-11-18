import { afterEach, describe, expect, it, vi } from "vitest"
import type {
  AppSettings,
  QuestionSounds,
  QuizzSounds,
} from "@razzia/common/types/game"
import Game from "@razzia/socket/services/game"
import { createFakeIo } from "@razzia/socket/test/fake-io"
import { createQuestion, createQuizz } from "@razzia/socket/test/fixtures"

const MANAGER = "manager"

// The app settings live in a file that other tests write too, so they are
// faked here instead of saved.
const app = vi.hoisted(() => ({ settings: {} as AppSettings }))

vi.mock("@razzia/socket/services/settings", () => ({
  getSettings: () => app.settings,
}))

const saveSettings = (settings: AppSettings) => {
  app.settings = settings
}

afterEach(() => {
  vi.useRealTimers()
})

/** The sounds of the first question's moment: before the game starts, or while it is asked. */
const resolve = async (
  quizzSounds: QuizzSounds | undefined,
  questionSounds?: QuestionSounds,
  started = false,
) => {
  vi.useFakeTimers()

  const fake = createFakeIo()
  const question = { ...createQuestion(), sounds: questionSounds }
  const game = new Game(fake.io, MANAGER, {
    ...createQuizz([question]),
    sounds: quizzSounds,
  })
  const { round } = game as unknown as {
    round: { sounds: Record<string, unknown> }
  }

  if (!started) {
    return round.sounds
  }

  const manager = fake.createSocket(MANAGER)

  game.reconnect(manager)
  game.join(fake.createSocket("alice"), "Alice")
  void game.start(manager)
  await vi.advanceTimersByTimeAsync(5000 + question.cooldown * 1000)

  return round.sounds
}

const SLOTS = ["music", "answerEnd", "leaderboard", "podium"] as const

describe("sound inheritance: app, quizz, question", () => {
  it.each(SLOTS)(
    "a quizz without its own %s uses the app sound",
    async (slot) => {
      saveSettings({ sounds: { [slot]: "lib:sfx/app" } })

      expect((await resolve(undefined))[slot]).toBe("lib:sfx/app")
      expect((await resolve({}))[slot]).toBe("lib:sfx/app")
      expect((await resolve({}, undefined, true))[slot]).toBe("lib:sfx/app")
    },
  )

  it.each(SLOTS)("the quizz %s wins over the app", async (slot) => {
    saveSettings({ sounds: { [slot]: "lib:sfx/app" } })

    expect(
      (await resolve({ [slot]: "lib:sfx/quizz" }, undefined, true))[slot],
    ).toBe("lib:sfx/quizz")
    expect((await resolve({ [slot]: "none" }, undefined, true))[slot]).toBe(
      "none",
    )
  })

  it.each(["music", "answerEnd"] as const)(
    "the question %s wins over the quizz and the app",
    async (slot) => {
      saveSettings({ sounds: { [slot]: "lib:sfx/app" } })
      const question = { [slot]: "lib:sfx/question" }
      const quizz = { [slot]: "lib:sfx/quizz" }

      expect((await resolve(quizz, question, true))[slot]).toBe(
        "lib:sfx/question",
      )
      expect((await resolve(undefined, question, true))[slot]).toBe(
        "lib:sfx/question",
      )
      expect((await resolve(quizz, {}, true))[slot]).toBe("lib:sfx/quizz")
      expect((await resolve(undefined, {}, true))[slot]).toBe("lib:sfx/app")
    },
  )

  it("ignores the question sounds before the game starts", async () => {
    saveSettings({ sounds: { music: "lib:sfx/app" } })

    expect(
      (await resolve(undefined, { music: "lib:sfx/question" })).music,
    ).toBe("lib:sfx/app")
  })

  it("leaves a slot empty when nothing is set anywhere", async () => {
    saveSettings({})

    const sounds = await resolve(undefined, undefined, true)

    for (const slot of SLOTS) {
      expect(sounds[slot]).toBeUndefined()
    }
  })

  it("passes the app volume on", async () => {
    saveSettings({ sounds: { volume: 40 } })

    expect((await resolve(undefined)).volume).toBe(40)
  })
})
