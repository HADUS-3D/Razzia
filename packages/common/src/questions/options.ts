import type {
  EstimationQuestionOptions,
  MultiQuestionOptions,
  PuzzleQuestionOptions,
  QuestionOptions,
} from "@razzia/common/types/game"

export const isMultiOptions = (
  options?: QuestionOptions,
): options is MultiQuestionOptions =>
  options !== undefined && "scoringMode" in options

export const isEstimationOptions = (
  options?: QuestionOptions,
): options is EstimationQuestionOptions =>
  options !== undefined && "min" in options && "max" in options

export const isPuzzleOptions = (
  options?: QuestionOptions,
): options is PuzzleQuestionOptions =>
  options !== undefined && "connections" in options
