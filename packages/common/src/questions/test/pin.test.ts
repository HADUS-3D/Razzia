import { describe, expect, it } from "vitest"
import {
  isPinPositionValid,
  mapDistance,
  pinAccuracy,
  pinDistance,
  pinDistanceInUnit,
  scorePin,
} from "@razzia/common/questions/pin"

describe("pinDistance", () => {
  it("measures in percent of the image width", () => {
    expect(pinDistance({ x: 10, y: 10 }, { x: 13, y: 10 })).toBe(3)
    // 10% of the height of a 2:1 image is 5% of its width
    expect(pinDistance({ x: 10, y: 10 }, { x: 10, y: 20 }, 2)).toBe(5)
  })
})

describe("pinAccuracy", () => {
  const options = { radius: 5, maxDistance: 25 }

  it("gives full points within the radius", () => {
    expect(pinAccuracy(0, options)).toBe(1)
    expect(pinAccuracy(5, options)).toBe(1)
  })

  it("falls in a straight line to nothing", () => {
    expect(pinAccuracy(15, options)).toBe(0.5)
    expect(pinAccuracy(25, options)).toBe(0)
    expect(pinAccuracy(80, options)).toBe(0)
  })
})

describe("scorePin", () => {
  it("combines distance and accuracy", () => {
    const options = { x: 50, y: 50, radius: 5, maxDistance: 25, aspect: 2 }

    expect(scorePin({ x: 50, y: 50 }, options)).toEqual({
      distance: 0,
      accuracy: 1,
    })
    expect(scorePin({ x: 65, y: 50 }, options).accuracy).toBe(0.5)
  })
})

describe("pinDistanceInUnit", () => {
  it("needs a known image width", () => {
    expect(pinDistanceInUnit(10, { imageWidth: 0 })).toBeNull()
    expect(pinDistanceInUnit(10, {})).toBeNull()
    expect(pinDistanceInUnit(10, { imageWidth: 4000 })).toBe(400)
  })
})

describe("mapDistance", () => {
  it("measures the distance over the earth in km", () => {
    const amsterdam = { x: 4.9, y: 52.37 }
    const paris = { x: 2.35, y: 48.86 }

    expect(mapDistance(amsterdam, amsterdam)).toBe(0)
    expect(mapDistance(amsterdam, paris)).toBeGreaterThan(420)
    expect(mapDistance(amsterdam, paris)).toBeLessThan(440)
  })

  it("scores on km for a map", () => {
    const options = {
      mode: "map" as const,
      x: 4.9,
      y: 52.37,
      radius: 10,
      maxDistance: 1000,
    }

    expect(scorePin({ x: 4.91, y: 52.37 }, options).accuracy).toBe(1)
    expect(scorePin({ x: -74, y: 40.7 }, options).accuracy).toBe(0)
  })
})

describe("isPinPositionValid", () => {
  it("checks percentages on an image and coordinates on a map", () => {
    const image = { x: 0, y: 0, radius: 1, maxDistance: 2 }
    const map = { ...image, mode: "map" as const }

    expect(isPinPositionValid({ x: 100, y: 100 }, image)).toBe(true)
    expect(isPinPositionValid({ x: 101, y: 50 }, image)).toBe(false)
    expect(isPinPositionValid({ x: -120, y: 80 }, map)).toBe(true)
    expect(isPinPositionValid({ x: 0, y: 91 }, map)).toBe(false)
    expect(isPinPositionValid({ x: Number.NaN, y: 0 }, map)).toBe(false)
  })
})
