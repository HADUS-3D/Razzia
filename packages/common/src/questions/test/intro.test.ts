import { describe, expect, it } from "vitest"
import { introSections } from "@razzia/common/questions/intro"

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
