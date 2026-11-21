import type { Question, QuestionType } from "@razzia/common/types/game"
import { QUESTION_TYPES } from "@razzia/common/constants"

/** A part of the intro slide: a question type that occurs, or the top challenge. */
export type IntroSection = QuestionType | "challenge"

const ORDER: QuestionType[] = [
  QUESTION_TYPES.SINGLE,
  QUESTION_TYPES.MULTI,
  QUESTION_TYPES.ESTIMATION,
  QUESTION_TYPES.PUZZLE,
  QUESTION_TYPES.PIN,
]

/**
 * The parts of the intro slide for a quizz: one for each question type that
 * really occurs, plus the top challenge when a question has one.
 */
export const introSections = (
  questions: Array<Pick<Question, "type" | "topPercent">>,
): IntroSection[] => {
  const types = new Set(questions.map((question) => question.type))
  const sections: IntroSection[] = ORDER.filter((type) => types.has(type))

  if (questions.some((question) => question.topPercent)) {
    sections.push("challenge")
  }

  return sections
}
