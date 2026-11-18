import type { Answer, Question } from "@razzia/common/types/game"
import type { ScoringFn } from "@razzia/socket/services/scoring"
import { QUESTION_TYPES } from "@razzia/common/constants"

export const type = QUESTION_TYPES.PIN

/**
 * The share of the points follows how close the pin landed, see `pinAccuracy`.
 * The server worked that out when the answer came in, so speed plays no part.
 */
export const scoring: ScoringFn = (
  _question: Question,
  _answerIds: number[],
  answer?: Answer,
): number => answer?.accuracy ?? 0
