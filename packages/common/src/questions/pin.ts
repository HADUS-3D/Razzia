import type { PinPosition, PinQuestionOptions } from "@razzia/common/types/game"
import {
  EARTH_RADIUS_KM,
  PIN_DEFAULT_MAP_VIEW,
  PIN_DEFAULTS,
  PIN_MAP_DEFAULTS,
  PIN_MODES,
} from "@razzia/common/constants"
import { isMapPin } from "@razzia/common/questions/options"

const DEFAULT_ASPECT = 1

/**
 * The distance between two positions in percent of the image width, so a tap
 * 10% to the side and one 10% of the width down are equally far away.
 */
export const pinDistance = (
  a: PinPosition,
  b: PinPosition,
  aspect = DEFAULT_ASPECT,
): number => Math.hypot(a.x - b.x, (a.y - b.y) / (aspect > 0 ? aspect : 1))

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** The distance over the earth in km between two longitude/latitude positions. */
export const mapDistance = (a: PinPosition, b: PinPosition): number => {
  const dLat = toRadians(b.y - a.y)
  const dLng = toRadians(b.x - a.x)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.y)) *
      Math.cos(toRadians(b.y)) *
      Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The distance from the right spot: km on a map, percent of the image width on an image. */
export const pinDistanceTo = (
  guess: PinPosition,
  options: PinQuestionOptions,
): number =>
  isMapPin(options)
    ? mapDistance(guess, options)
    : pinDistance(guess, options, options.aspect)

/** Whether a position is on the playing field. */
export const isPinPositionValid = (
  position: PinPosition,
  options: PinQuestionOptions,
): boolean => {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    return false
  }

  return isMapPin(options)
    ? Math.abs(position.x) <= 180 && Math.abs(position.y) <= 90
    : position.x >= 0 &&
        position.x <= 100 &&
        position.y >= 0 &&
        position.y <= 100
}

/**
 * 1 within the radius, then falling in a straight line to 0 at
 * `maxDistance`. A tap further away than that earns nothing.
 */
export const pinAccuracy = (
  distance: number,
  { radius, maxDistance }: Pick<PinQuestionOptions, "radius" | "maxDistance">,
): number => {
  if (distance <= radius) {
    return 1
  }

  if (distance >= maxDistance) {
    return 0
  }

  return 1 - (distance - radius) / (maxDistance - radius)
}

/** How far a tap is from the right spot and how much of the points that earns. */
export const scorePin = (
  guess: PinPosition,
  options: PinQuestionOptions,
): { distance: number; accuracy: number } => {
  const distance = pinDistanceTo(guess, options)

  return { distance, accuracy: pinAccuracy(distance, options) }
}

export const defaultPinOptions = (): PinQuestionOptions => ({
  x: 50,
  y: 50,
  radius: PIN_DEFAULTS.RADIUS,
  maxDistance: PIN_DEFAULTS.MAX_DISTANCE,
  aspect: DEFAULT_ASPECT,
  imageWidth: 0,
  unit: "km",
})

/** A distance as the maker's unit when the image has a real-life width, else as a percentage. */
export const pinDistanceInUnit = (
  distance: number,
  { imageWidth, mode }: Pick<PinQuestionOptions, "imageWidth" | "mode">,
): number | null => {
  if (mode === PIN_MODES.MAP) {
    return distance
  }

  return imageWidth !== undefined && imageWidth > 0
    ? (distance / 100) * imageWidth
    : null
}

export const defaultMapPinOptions = (): PinQuestionOptions => ({
  mode: PIN_MODES.MAP,
  x: 0,
  y: 0,
  view: { ...PIN_DEFAULT_MAP_VIEW },
  radius: PIN_MAP_DEFAULTS.RADIUS_KM,
  maxDistance: PIN_MAP_DEFAULTS.MAX_DISTANCE_KM,
  unit: "km",
})
