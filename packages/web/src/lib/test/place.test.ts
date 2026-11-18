import { describe, expect, it } from "vitest"
import { formatOrdinal } from "@razzia/web/lib/place"

describe("formatOrdinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [10, "10th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [23, "23rd"],
    [101, "101st"],
    [111, "111th"],
  ])("writes %d in english as %s", (rank, expected) => {
    expect(formatOrdinal("en", rank)).toBe(expected)
  })

  it.each([
    [1, "1e"],
    [2, "2de"],
    [3, "3de"],
    [4, "4e"],
    [12, "12e"],
    [13, "13e"],
    [22, "22e"],
    [23, "23e"],
    [102, "102e"],
  ])("writes %d in dutch as %s", (rank, expected) => {
    expect(formatOrdinal("nl", rank)).toBe(expected)
  })

  it("accepts regional language codes", () => {
    expect(formatOrdinal("nl-NL", 2)).toBe("2de")
    expect(formatOrdinal("en-GB", 2)).toBe("2nd")
  })
})
