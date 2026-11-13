import { z } from "zod"
import type { Question } from "@razzia/common/types/game"
import {
  MAX_ANSWERS,
  MIN_ANSWERS,
  QUESTION_TYPES,
} from "@razzia/common/constants"

const INVALID_ROUND = "errors:generator.invalidImport"

const roundQuestionValidator = z
  .object({
    question: z.string().trim().min(1, INVALID_ROUND),
    answers: z
      .array(z.string().trim().min(1, INVALID_ROUND))
      .min(MIN_ANSWERS, INVALID_ROUND)
      .max(MAX_ANSWERS, INVALID_ROUND),
    solutions: z.array(z.number().int().min(0)).min(1, INVALID_ROUND),
    category: z.string().trim().min(1).optional(),
  })
  .refine(
    ({ answers, solutions }) =>
      solutions.every((solution) => solution < answers.length),
    INVALID_ROUND,
  )

/**
 * The smallest shape needed to move a round of questions around, for instance
 * through an AI tool that translates it. Timing and question type are left out
 * and filled in with defaults on import.
 */
export const roundValidator = z.object({
  questions: z.array(roundQuestionValidator).min(1, INVALID_ROUND),
})

export type Round = z.infer<typeof roundValidator>

export const ROUND_DEFAULTS = { cooldown: 5, time: 20 } as const

export const toRound = (questions: Question[]): Round => ({
  questions: questions.map(({ question, answers, solutions, category }) => ({
    question,
    answers,
    solutions: solutions ?? [],
    ...(category ? { category } : {}),
  })),
})

export const fromRound = (round: Round): Question[] =>
  round.questions.map((question) => ({
    type: QUESTION_TYPES.SINGLE,
    ...question,
    ...ROUND_DEFAULTS,
  }))

const FENCE = /^```(?:json)?\s*([\s\S]*?)\s*```$/iu

/**
 * Reads the JSON an AI tool returned: tolerates a markdown code fence around it
 * and a bare array of questions. Returns null when it is not a valid round.
 */
export const parseRound = (text: string): Question[] | null => {
  const trimmed = text.trim()
  const body = FENCE.exec(trimmed)?.[1] ?? trimmed

  try {
    const data: unknown = JSON.parse(body)
    const result = roundValidator.safeParse(
      Array.isArray(data) ? { questions: data } : data,
    )

    return result.success ? fromRound(result.data) : null
  } catch {
    return null
  }
}
