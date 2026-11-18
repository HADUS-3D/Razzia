import { describe, expect, it } from "vitest"
import { EVENTS } from "@razzia/common/constants"
import { clientEventValidators } from "@razzia/common/validators/socket"

const validator = clientEventValidators[EVENTS.PLAYER.SELECTED_ANSWER]

describe("selected answer validator, pin", () => {
  it.each([
    { x: 5.1, y: 52.3 },
    { x: -73.9, y: 40.7 },
    { x: 151.2, y: -33.9 },
    { x: 179.9, y: -89 },
    { x: 0, y: 100 },
  ])("accepts a pin at %j", (pin) => {
    expect(validator.safeParse({ gameId: "g", data: { pin } }).success).toBe(
      true,
    )
  })

  it.each([
    { x: 181, y: 0 },
    { x: 0, y: -181 },
    { x: Number.NaN, y: 0 },
  ])("rejects a pin at %j", (pin) => {
    expect(validator.safeParse({ gameId: "g", data: { pin } }).success).toBe(
      false,
    )
  })
})
