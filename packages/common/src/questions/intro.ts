import type {
  EstimationQuestionOptions,
  Question,
  QuestionType,
} from "@razzia/common/types/game"
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

/** How the estimation questions of a quizz score: with a margin, closest wins, or both. */
export type IntroEstimationMode = "margin" | "closest" | "mixed"

/** Who gets the top challenges: the share and the number of players, as a range when it differs. */
export interface IntroChallenge {
  minPercent: number
  maxPercent: number
  minCount: number
  maxCount: number
}

export interface IntroDetails {
  estimation?: IntroEstimationMode
  challenge?: IntroChallenge
}

/** How many players a top challenge asks: the best `percent` percent, at least one. */
const challengeCount = (totalPlayers: number, percent: number): number =>
  Math.max(1, Math.ceil((totalPlayers * percent) / 100))

/** The facts the intro slide fills its estimation and top challenge texts with. */
export const introDetails = (
  questions: Array<Pick<Question, "type" | "topPercent" | "options">>,
  totalPlayers: number,
): IntroDetails => {
  const details: IntroDetails = {}
  const estimations = questions.filter(
    (question) => question.type === QUESTION_TYPES.ESTIMATION,
  )

  if (estimations.length > 0) {
    const closest = estimations.filter(
      (question) =>
        (question.options as EstimationQuestionOptions | undefined)
          ?.closestWins === true,
    ).length

    if (closest === 0) {
      details.estimation = "margin"
    } else if (closest === estimations.length) {
      details.estimation = "closest"
    } else {
      details.estimation = "mixed"
    }
  }

  const percents = questions
    .map((question) => question.topPercent)
    .filter((percent): percent is number => Boolean(percent))

  if (percents.length > 0) {
    const minPercent = Math.min(...percents)
    const maxPercent = Math.max(...percents)

    details.challenge = {
      minPercent,
      maxPercent,
      minCount: challengeCount(totalPlayers, minPercent),
      maxCount: challengeCount(totalPlayers, maxPercent),
    }
  }

  return details
}
