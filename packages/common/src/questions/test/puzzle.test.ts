import { describe, expect, it } from "vitest"
import {
  isPuzzleAnswerCorrect,
  matchPuzzleTexts,
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

  it("does not care in which field an answer was typed", () => {
    expect(
      solvedPuzzleGroups(["shakespeare", "PLANETS", "rivers"], connections),
    ).toEqual([0, 1, 2])
    expect(solvedPuzzleGroups(["", "", "rivers"], connections)).toEqual([1])
  })

  it("counts an answer typed twice only once", () => {
    expect(
      solvedPuzzleGroups(["planets", "planets", "Planets"], connections),
    ).toEqual([0])
  })

  it("lets an answer that fits two groups settle for the free one", () => {
    const overlapping = [["Animals", "Pets"], ["Pets"], ["Cars"]]

    expect(solvedPuzzleGroups(["pets", "animals"], overlapping)).toEqual([0, 1])
    expect(matchPuzzleTexts(["pets", "animals"], overlapping)).toEqual([
      1,
      0,
      undefined,
    ])
  })
})

describe("puzzleGroupWords", () => {
  it("slices the flat words into groups of 4", () => {
    const words = Array.from({ length: 12 }, (_, i) => String(i))

    expect(puzzleGroupWords(words, 1)).toEqual(["4", "5", "6", "7"])
  })
})
