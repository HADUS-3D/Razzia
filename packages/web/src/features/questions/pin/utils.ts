import type {
  PinMapView,
  PinMode,
  PinQuestionOptions,
  PlayerQuestionOptions,
  QuestionOptions,
} from "@razzia/common/types/game"
import { PIN_MODES } from "@razzia/common/constants"
import { isPinOptions } from "@razzia/common/questions/options"
import {
  defaultPinOptions,
  pinDistanceInUnit,
} from "@razzia/common/questions/pin"

export const createDefaultPinOptions = defaultPinOptions

export const getPinOptions = (options?: QuestionOptions): PinQuestionOptions =>
  isPinOptions(options) ? options : defaultPinOptions()

export const pinMode = (options?: PlayerQuestionOptions): PinMode =>
  options && "mode" in options && options.mode === PIN_MODES.MAP
    ? PIN_MODES.MAP
    : PIN_MODES.IMAGE

export const pinView = (
  options?: PlayerQuestionOptions,
): PinMapView | undefined =>
  options && "view" in options ? options.view : undefined

/** An image is the field players tap, so the game and the editor leave out the usual media preview. */
export const pinMediaInAnswer = (options?: PlayerQuestionOptions): boolean =>
  pinMode(options) === PIN_MODES.IMAGE

export const pinInitialValues = () => ({
  answers: [],
  solutions: undefined,
  options: defaultPinOptions(),
})

/** A distance in the maker's unit when the image has a known width, else as a percentage of it. */
export const formatPinDistance = (
  distance: number,
  options: PinQuestionOptions,
): string => {
  const inUnit = pinDistanceInUnit(distance, options)

  if (options.mode === PIN_MODES.MAP) {
    return `${distance.toLocaleString(undefined, { maximumFractionDigits: distance >= 100 ? 0 : 1 })} km`
  }

  if (inUnit === null) {
    return `${distance.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
  }

  let digits = 2

  if (inUnit >= 100) {
    digits = 0
  } else if (inUnit >= 10) {
    digits = 1
  }

  return `${inUnit.toLocaleString(undefined, { maximumFractionDigits: digits })} ${options.unit ?? ""}`.trim()
}

/** A distinct colour per player, so pins and list rows can be matched by eye. */
export const pinColor = (index: number): string =>
  `hsl(${(index * 137.5) % 360} 80% 50%)`
