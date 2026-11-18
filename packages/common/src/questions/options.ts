import type {
  EstimationQuestionOptions,
  MultiQuestionOptions,
  PinQuestionOptions,
  PlayerQuestionOptions,
  PuzzleQuestionOptions,
  QuestionOptions,
} from "@razzia/common/types/game"

export const isMultiOptions = (
  options?: QuestionOptions,
): options is MultiQuestionOptions =>
  options !== undefined && "scoringMode" in options

export const isEstimationOptions = (
  options?: PlayerQuestionOptions,
): options is EstimationQuestionOptions =>
  options !== undefined && "min" in options && "max" in options

export const isPuzzleOptions = (
  options?: QuestionOptions,
): options is PuzzleQuestionOptions =>
  options !== undefined && "connections" in options

export const isMapPin = (options: PinQuestionOptions): boolean =>
  options.mode === "map"

export const isPinOptions = (
  options?: QuestionOptions,
): options is PinQuestionOptions =>
  options !== undefined && "radius" in options && "maxDistance" in options
