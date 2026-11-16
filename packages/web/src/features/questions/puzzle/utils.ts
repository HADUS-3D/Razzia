import type { Question, QuestionOptions } from "@razzia/common/types/game"
import { PUZZLE_GROUP_SIZE, PUZZLE_GROUPS } from "@razzia/common/constants"
import { isPuzzleOptions } from "@razzia/common/questions/options"

export const createDefaultPuzzleOptions = () => ({
  connections: Array.from({ length: PUZZLE_GROUPS }, () => [""]),
})

export const getPuzzleConnections = (options?: QuestionOptions): string[][] =>
  isPuzzleOptions(options)
    ? options.connections
    : createDefaultPuzzleOptions().connections

export const puzzleInitialValues = (): Partial<Question> => ({
  answers: Array.from({ length: PUZZLE_GROUPS * PUZZLE_GROUP_SIZE }, () => ""),
  solutions: undefined,
  options: createDefaultPuzzleOptions(),
})
