import { z } from "zod"
import type { QuestionRefinement } from "@razzia/common/validators/questions"
import {
  MAX_PUZZLE_ANSWER_LENGTH,
  PUZZLE_GROUP_SIZE,
  PUZZLE_GROUPS,
} from "@razzia/common/constants"
import { isPuzzleOptions } from "@razzia/common/questions/options"

export const puzzleOptionsValidator = z.object({
  connections: z.array(
    z.array(
      z
        .string()
        .max(MAX_PUZZLE_ANSWER_LENGTH, "errors:quizz.puzzleConnectionTooLong"),
    ),
  ),
})

export const refinePuzzleQuestion: QuestionRefinement = (
  { answers, options },
  addIssue,
) => {
  if (answers.length !== PUZZLE_GROUPS * PUZZLE_GROUP_SIZE) {
    addIssue(["answers"], "errors:quizz.puzzleWordCount")
  }

  if (
    !isPuzzleOptions(options) ||
    options.connections.length !== PUZZLE_GROUPS
  ) {
    addIssue(["options"], "errors:quizz.puzzleInvalidOptions")

    return
  }

  options.connections.forEach((accepted, group) => {
    if (!accepted.some((connection) => connection.trim() !== "")) {
      addIssue(
        ["options", "connections", group],
        "errors:quizz.puzzleConnectionEmpty",
      )
    }
  })
}
