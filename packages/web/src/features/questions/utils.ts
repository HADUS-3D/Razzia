import type { Question } from "@razzia/common/types/game"
import { MAX_ANSWERS, MIN_ANSWERS } from "@razzia/common/constants"
import { estimationAccuracy } from "@razzia/common/questions/estimation"
import {
  isEstimationOptions,
  isPuzzleOptions,
} from "@razzia/common/questions/options"

export const choiceInitialValues = (question: Question): Partial<Question> => {
  const hasAnswers =
    question.answers.length >= MIN_ANSWERS &&
    question.answers.length <= MAX_ANSWERS

  if (hasAnswers && question.solutions?.length) {
    return {}
  }

  return hasAnswers ? { solutions: [0] } : { answers: ["", ""], solutions: [0] }
}

export const isAnswerCorrect = (
  question: Question,
  answerIds: number[] | null,
): boolean => {
  const { solutions, options } = question

  // For a puzzle the ids are the groups that were solved.
  if (isPuzzleOptions(options)) {
    return (answerIds?.length ?? 0) > 0
  }

  if (!answerIds || !solutions) {
    return false
  }

  if (isEstimationOptions(options)) {
    const value = answerIds.at(0)
    const solution = solutions.at(0)

    return (
      value !== undefined &&
      solution !== undefined &&
      estimationAccuracy(value, solution, options.margin) > 0
    )
  }

  return answerIds.some((id) => solutions.includes(id))
}
