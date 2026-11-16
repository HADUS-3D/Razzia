import type { Question } from "@razzia/common/types/game"
import type { ScoringFn } from "@razzia/socket/services/scoring"
import { PUZZLE_GROUPS, QUESTION_TYPES } from "@razzia/common/constants"

export const type = QUESTION_TYPES.PUZZLE

/**
 * `answerIds` holds the groups the player solved, so every solved group is
 * worth the same share of the points, whoever was first.
 */
export const scoring: ScoringFn = (
  _question: Question,
  answerIds: number[],
): number => new Set(answerIds).size / PUZZLE_GROUPS
