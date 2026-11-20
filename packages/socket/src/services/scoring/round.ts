import type { Answer, Player, Question } from "@razzia/common/types/game"
import { isClosestEstimation } from "@razzia/common/questions/estimation"
import { isEstimationOptions } from "@razzia/common/questions/options"
import { QUESTION_SCORING } from "@razzia/socket/services/scoring"

export type ScoredPlayer = Player & {
  lastCorrect: boolean
  lastPoints: number
}

export const countAnswers = (answers: Answer[]): Record<number, number> => {
  const answerIds = answers.flatMap((answer) => answer.answerIds)

  return answerIds.reduce<Record<number, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1

    return acc
  }, {})
}

const penaltyFor = (question: Question, currentPoints: number): number => {
  if (question.penaltyPercent) {
    return Math.round((currentPoints * question.penaltyPercent) / 100)
  }

  return question.penalty ?? 0
}

export const scoreQuestion = (
  question: Question,
  players: Player[],
  answers: Answer[],
): ScoredPlayer[] => {
  // A top challenge (`topPercent`) only gets the players that were asked it.
  const isChallenge = question.topPercent !== undefined
  // With "closest wins" only the answer(s) nearest to the solution score, in full.
  const solution = question.solutions?.at(0)
  const closestTo =
    isEstimationOptions(question.options) &&
    question.options.closestWins === true
      ? solution
      : undefined
  const estimates =
    closestTo === undefined
      ? []
      : players.flatMap((player) => {
          const value = answers
            .find((a) => a.playerId === player.id)
            ?.answerIds.at(0)

          return value === undefined ? [] : [value]
        })

  const scored = players.map((player) => {
    const playerAnswer = answers.find((a) => a.playerId === player.id)

    const scoreMultiplier = (() => {
      if (!playerAnswer) {
        return 0
      }

      if (closestTo !== undefined) {
        const value = playerAnswer.answerIds.at(0)

        return value !== undefined &&
          isClosestEstimation(value, estimates, closestTo)
          ? 1
          : 0
      }

      const scoring = QUESTION_SCORING[question.type]

      return scoring(question, playerAnswer.answerIds, playerAnswer)
    })()

    const isCorrect = scoreMultiplier > 0
    // A challenge keeps the points of whoever gets it right.
    const points = isChallenge
      ? 0
      : Math.round((playerAnswer?.points ?? 0) * scoreMultiplier)
    // A challenge also penalises not answering: it counts as wrong.
    const isPenalised = !isCorrect && (playerAnswer ?? isChallenge)
    const penalty = isPenalised ? penaltyFor(question, player.points) : 0

    player.points = Math.max(0, player.points + points - penalty)
    player.streak = isCorrect ? player.streak + 1 : 0
    player.bestStreak = Math.max(player.bestStreak, player.streak)

    return {
      ...player,
      lastCorrect: isCorrect,
      lastPoints: isCorrect ? points : -penalty,
    }
  })

  return scored.sort((a, b) => b.points - a.points)
}
