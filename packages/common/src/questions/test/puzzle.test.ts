import { describe, expect, it } from "vitest"
import {
  isPuzzleAnswerCorrect,
  normalizePuzzleAnswer,
  puzzleGroupWords,
  solvedPuzzleGroups,
} from "@razzia/common/questions/puzzle"

describe("normalizePuzzleAnswer", () => {
  it("ignores capitals, accents and extra spaces", () => {
    expect(normalizePuzzleAnswer("  Café   AU  Lait ")).toBe("cafe au lait")
    expect(normalizePuzzleAnswer("Ñandú")).toBe("nandu")
  })
})

describe("isPuzzleAnswerCorrect", () => {
  it("accepts any listed variant, ignoring capitals and accents", () => {
    expect(isPuzzleAnswerCorrect("PLANETEN", ["Planeten", "Planetjes"])).toBe(
      true,
    )
    expect(isPuzzleAnswerCorrect("planetjes", ["Planeten", "Planetjes"])).toBe(
      true,
    )
    expect(isPuzzleAnswerCorrect("Café", ["cafe"])).toBe(true)
  })

  it("does not forgive typos", () => {
    expect(isPuzzleAnswerCorrect("Planeetn", ["Planeten"])).toBe(false)
    expect(isPuzzleAnswerCorrect("Planeet", ["Planeten"])).toBe(false)
  })

  it("never accepts a blank answer", () => {
    expect(isPuzzleAnswerCorrect("  ", [""])).toBe(false)
  })
})

describe("solvedPuzzleGroups", () => {
  const connections = [["Planets"], ["Rivers"], ["Plays", "Shakespeare"]]

  it("returns the groups that were named right", () => {
    expect(
      solvedPuzzleGroups(["planets", "wrong", "shakespeare"], connections),
    ).toEqual([0, 2])
    expect(solvedPuzzleGroups([], connections)).toEqual([])
  })
})

describe("puzzleGroupWords", () => {
  it("slices the flat words into groups of 4", () => {
    const words = Array.from({ length: 12 }, (_, i) => String(i))

    expect(puzzleGroupWords(words, 1)).toEqual(["4", "5", "6", "7"])
  })
})
