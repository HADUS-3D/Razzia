import { describe, expect, it } from "vitest"
import {
  backgroundUrl,
  isSameImage,
  parseBackground,
  withFocus,
} from "@razzia/common/background"
import { backgroundValidator } from "@razzia/common/validators/quizz"

describe("background focus", () => {
  it("defaults to the center without a fragment", () => {
    expect(parseBackground("/media/a.png")).toEqual({
      url: "/media/a.png",
      focus: { x: 50, y: 50 },
    })
  })

  it("round-trips a focus point", () => {
    const value = withFocus("/media/a.png", { x: 30.26, y: 65 })

    expect(value).toBe("/media/a.png#focus=30.3,65")
    expect(parseBackground(value)).toEqual({
      url: "/media/a.png",
      focus: { x: 30.3, y: 65 },
    })
  })

  it("stores the centered default as a plain url and replaces an old focus", () => {
    expect(withFocus("/media/a.png#focus=10,10", { x: 50, y: 50 })).toBe(
      "/media/a.png",
    )
    expect(withFocus("https://x.nl/a.png#focus=10,10", { x: 20, y: 80 })).toBe(
      "https://x.nl/a.png#focus=20,80",
    )
  })

  it("compares images ignoring the focus", () => {
    expect(backgroundUrl("/media/a.png#focus=1,2")).toBe("/media/a.png")
    expect(isSameImage("/media/a.png#focus=1,2", "/media/a.png")).toBe(true)
    expect(isSameImage("/media/a.png", undefined)).toBe(false)
  })

  it("is accepted by the background validator", () => {
    expect(
      backgroundValidator.safeParse("/media/a.png#focus=1,2").success,
    ).toBe(true)
    expect(
      backgroundValidator.safeParse("https://x.nl/a.png#focus=1,2").success,
    ).toBe(true)
  })
})
