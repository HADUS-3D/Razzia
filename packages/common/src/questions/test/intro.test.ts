import { describe, expect, it } from "vitest"
import { ESTIMATION_INPUT_MODES } from "@razzia/common/constants"
import { introDetails, introSections } from "@razzia/common/questions/intro"

describe("introSections", () => {
  it("lists only the question types that occur, in a fixed order", () => {
    expect(
      introSections([{ type: "pin" }, { type: "single" }, { type: "pin" }]),
    ).toEqual(["single", "pin"])
  })

  it("adds the top challenge when a question has one", () => {
    expect(
      introSections([{ type: "single" }, { type: "multi", topPercent: 20 }]),
    ).toEqual(["single", "multi", "challenge"])
  })
})

describe("introDetails", () => {
  const estimation = (closestWins?: boolean) => ({
    type: "estimation" as const,
    options: {
      inputMode: ESTIMATION_INPUT_MODES.SLIDER,
      min: 0,
      max: 10,
      step: 1,
      margin: 0,
      closestWins,
    },
  })

  it("says how estimation scores: margin, closest or mixed", () => {
    expect(introDetails([estimation()], 10).estimation).toBe("margin")
    expect(introDetails([estimation(true)], 10).estimation).toBe("closest")
    expect(introDetails([estimation(true), estimation()], 10).estimation).toBe(
      "mixed",
    )
    expect(introDetails([{ type: "single" }], 10).estimation).toBeUndefined()
  })

  it("counts the players of the top challenges, as a range when they differ", () => {
    expect(
      introDetails([{ type: "single", topPercent: 25 }], 10).challenge,
    ).toEqual({ minPercent: 25, maxPercent: 25, minCount: 3, maxCount: 3 })
    expect(
      introDetails(
        [
          { type: "single", topPercent: 10 },
          { type: "multi", topPercent: 50 },
        ],
        20,
      ).challenge,
    ).toEqual({ minPercent: 10, maxPercent: 50, minCount: 2, maxCount: 10 })
    expect(introDetails([{ type: "single" }], 10).challenge).toBeUndefined()
  })
})
