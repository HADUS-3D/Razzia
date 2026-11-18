import { afterEach, describe, expect, it, vi } from "vitest"
import { createQuestion } from "@razzia/socket/test/fixtures"
import { normalizeFilename } from "@razzia/socket/utils/file"
import {
  applySpeedBonus,
  orderToPoint,
  timeToPoint,
  topPlayers,
} from "@razzia/socket/utils/game"
import { createNickname } from "@razzia/socket/utils/nickname"

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("orderToPoint", () => {
  it("gives full points to the first and half to the last player", () => {
    expect(orderToPoint(0, 3)).toBe(1000)
    expect(orderToPoint(1, 3)).toBe(750)
    expect(orderToPoint(2, 3)).toBe(500)
  })

  it("gives full points to a lone player", () => {
    expect(orderToPoint(0, 1, 200)).toBe(200)
  })
})

describe("timeToPoint", () => {
  it("decreases the points with the time spent answering", () => {
    vi.useFakeTimers()

    const question = createQuestion({ time: 10, maxPoints: 2000 })
    const start = Date.now()

    expect(timeToPoint(start, question)).toBe(2000)

    vi.advanceTimersByTime(5000)

    expect(timeToPoint(start, question)).toBe(1000)

    vi.advanceTimersByTime(10_000)

    expect(timeToPoint(start, question)).toBe(0)
  })
})

describe("createNickname", () => {
  it("adds a suffix when every generated name is taken", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    expect(createNickname([])).toBe("Brave Badger")
    expect(createNickname(["Brave Badger", "Brave Badger 2"])).toBe(
      "Brave Badger 3",
    )
  })
})

describe("normalizeFilename", () => {
  it("builds a safe slug followed by a random id", () => {
    expect(normalizeFilename("Élève Été!", { fallback: "x" })).toMatch(
      /^eleve-ete-[\w-]{8}$/u,
    )
  })

  it("falls back when nothing usable is left", () => {
    expect(normalizeFilename("../../", { fallback: "quizz" })).toMatch(
      /^quizz-[\w-]{8}$/u,
    )
  })
})

describe("GAME_SPEED", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("speeds up every game delay", async () => {
    vi.resetModules()
    vi.stubEnv("GAME_SPEED", "10")

    const { SECOND_MS } = await import("@razzia/socket/utils/sleep")

    expect(SECOND_MS).toBe(100)
  })

  it("keeps real seconds by default", async () => {
    vi.resetModules()

    const { SECOND_MS } = await import("@razzia/socket/utils/sleep")

    expect(SECOND_MS).toBe(1000)
  })

  it("refuses an invalid speed", async () => {
    vi.resetModules()
    vi.stubEnv("GAME_SPEED", "0")

    await expect(import("@razzia/socket/env")).rejects.toThrow(
      "GAME_SPEED must be a positive number",
    )
  })
})

describe("applySpeedBonus", () => {
  it("leaves the points alone at 100 percent or by default", () => {
    expect(applySpeedBonus(300, 1000)).toBe(300)
    expect(applySpeedBonus(300, 1000, 100)).toBe(300)
  })

  it("gives every right answer full points at 0 percent", () => {
    expect(applySpeedBonus(0, 1000, 0)).toBe(1000)
  })

  it("mixes a fixed part with a speed part in between", () => {
    expect(applySpeedBonus(0, 1000, 50)).toBe(500)
    expect(applySpeedBonus(1000, 1000, 50)).toBe(1000)
  })
})

describe("topPlayers", () => {
  const players = [10, 50, 30, 20, 40].map((points) => ({ points }))

  it("takes the best percentage of the players, rounded up", () => {
    expect(topPlayers(players, 40).map((p) => p.points)).toEqual([50, 40])
    expect(topPlayers(players, 50).map((p) => p.points)).toEqual([50, 40, 30])
  })

  it("always takes at least one player", () => {
    expect(topPlayers(players, 1).map((p) => p.points)).toEqual([50])
  })
})
