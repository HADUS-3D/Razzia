import { z } from "zod"
import {
  MAX_MEDIA_SIZE,
  MEDIA_TYPES,
  MEDIA_URL_PREFIX,
  QUESTION_TYPES,
  QUIZZ_MODES,
  QUIZZ_SOURCES,
  SCORING_MODES,
  SOUND_LIBRARY_PREFIX,
  SOUND_NONE,
} from "@razzia/common/constants"
import { QUESTION_REFINEMENTS } from "@razzia/common/validators/questions"
import { multiOptionsValidator } from "@razzia/common/validators/questions/choice"
import { estimationOptionsValidator } from "@razzia/common/validators/questions/estimation"
import { pinOptionsValidator } from "@razzia/common/validators/questions/pin"
import { puzzleOptionsValidator } from "@razzia/common/validators/questions/puzzle"

const mediaUrlValidator = z
  .string("errors:quizz.invalidMediaUrl")
  .refine(
    (url) => url.startsWith(MEDIA_URL_PREFIX) || z.url().safeParse(url).success,
    "errors:quizz.invalidMediaUrl",
  )

export const questionMediaValidator = z.object({
  type: z
    .enum([MEDIA_TYPES.IMAGE, MEDIA_TYPES.VIDEO, MEDIA_TYPES.AUDIO])
    .optional(),
  url: mediaUrlValidator,
})

/** URL of an image shown behind the game, per question, quizz or app. */
export const backgroundValidator = z
  .string("errors:quizz.invalidMediaUrl")
  .refine(
    (url) => url.startsWith(MEDIA_URL_PREFIX) || /^https?:\/\//u.test(url),
    "errors:quizz.invalidMediaUrl",
  )

/**
 * A sound: "none" for silence, "lib:..." for one that ships with the app, or an
 * uploaded audio file. Left out, it is inherited from the level above.
 */
export const soundValidator = z
  .string("errors:quizz.invalidSound")
  .refine(
    (value) =>
      value === SOUND_NONE ||
      value.startsWith(SOUND_LIBRARY_PREFIX) ||
      value.startsWith(MEDIA_URL_PREFIX),
    "errors:quizz.invalidSound",
  )

const questionSoundsValidator = z.object({
  /** Music during the answer moment, on the big screen. */
  music: soundValidator.optional(),
  /** Effect at the end of the answer moment. */
  answerEnd: soundValidator.optional(),
})

const quizzSoundsValidator = questionSoundsValidator.extend({
  /** Effect when the leaderboard shows. */
  leaderboard: soundValidator.optional(),
  /** Fanfare for the winner on the podium. */
  podium: soundValidator.optional(),
})

export const appSettingsValidator = z.object({
  background: backgroundValidator.optional(),
  sounds: quizzSoundsValidator
    .extend({
      /** Percent of the normal volume. */
      volume: z
        .number()
        .int()
        .min(0, "errors:quizz.volumeRange")
        .max(100, "errors:quizz.volumeRange")
        .optional(),
    })
    .optional(),
})

export const mediaUploadValidator = z.object({
  file: z
    .file("errors:media.missingFile")
    .max(MAX_MEDIA_SIZE, "errors:media.tooLarge"),
})

export const questionRoundValidator = z.object({
  name: z.string().trim().min(1, "errors:quizz.roundNameEmpty"),
  background: backgroundValidator.optional(),
})

const questionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  question: z.string().min(1, "errors:quizz.questionEmpty"),
  category: z.string().optional(),
  round: questionRoundValidator.optional(),
  note: z.string().optional(),
  media: questionMediaValidator.optional(),
  background: backgroundValidator.optional(),
  sounds: questionSoundsValidator.optional(),
  answers: z.array(z.string().min(1, "errors:quizz.answerEmpty")),
  solutions: z.array(z.number()).optional(),
  cooldown: z
    .number()
    .int()
    .min(3, "errors:quizz.cooldownTooShort")
    .max(15, "errors:quizz.cooldownTooLong"),
  time: z.number().int().min(-1),
  maxPoints: z
    .number()
    .int()
    .min(0, "errors:quizz.maxPointsNegative")
    .optional(),
  penalty: z.number().int().min(0, "errors:quizz.penaltyNegative").optional(),
  penaltyPercent: z
    .number()
    .int()
    .min(1, "errors:quizz.penaltyPercentRange")
    .max(100, "errors:quizz.penaltyPercentRange")
    .optional(),
  topPercent: z
    .number()
    .int()
    .min(1, "errors:quizz.topPercentRange")
    .max(100, "errors:quizz.topPercentRange")
    .optional(),
  options: z
    .union([
      multiOptionsValidator,
      estimationOptionsValidator,
      puzzleOptionsValidator,
      pinOptionsValidator,
    ])
    .optional(),
})

const questionValidator = questionSchema.superRefine((question, ctx) => {
  if (question.penalty !== undefined && question.penaltyPercent !== undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["penaltyPercent"],
      message: "errors:quizz.penaltyBoth",
    })
  }

  QUESTION_REFINEMENTS[question.type](question, (path, message) =>
    ctx.addIssue({ code: "custom", path, message }),
  )
})

export const quizzValidator = z
  .object({
    gameMode: z.enum(QUIZZ_MODES),
    subject: z.string().min(1, "errors:quizz.subjectEmpty"),
    source: z.enum(QUIZZ_SOURCES).optional(),
    background: backgroundValidator.optional(),
    sounds: quizzSoundsValidator.optional(),
    speedBonus: z
      .number()
      .int()
      .min(0, "errors:quizz.speedBonusRange")
      .max(100, "errors:quizz.speedBonusRange")
      .optional(),
    intro: z.boolean().optional(),
    questions: z.array(questionValidator).min(1, "errors:quizz.noQuestions"),
  })
  .superRefine((quizz, ctx) => {
    if (quizz.gameMode !== QUIZZ_MODES.QUIZ) {
      quizz.questions.forEach((question, index) => {
        if (question.type === QUESTION_TYPES.PUZZLE) {
          ctx.addIssue({
            code: "custom",
            path: ["questions", index, "type"],
            message: "errors:quizz.puzzleNeedsQuiz",
          })
        }

        if (question.type === QUESTION_TYPES.PIN) {
          ctx.addIssue({
            code: "custom",
            path: ["questions", index, "type"],
            message: "errors:quizz.pinNeedsQuiz",
          })
        }
      })

      return
    }

    quizz.questions.forEach((question, index) => {
      // The solutions of a puzzle or a pin question live in its options.
      if (
        question.type === QUESTION_TYPES.PUZZLE ||
        question.type === QUESTION_TYPES.PIN ||
        (question.solutions && question.solutions.length > 0)
      ) {
        return
      }

      ctx.addIssue({
        code: "custom",
        path: ["questions", index, "solutions"],
        message: "errors:quizz.noSolution",
      })
    })
  })

export type QuizzValidated = z.infer<typeof quizzValidator>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

/**
 * Upgrades quizz files written by older versions: quizzes without a `gameMode`,
 * questions without a `type`, a scalar `solutions`, or options without a
 * `scoringMode`.
 */
export const normalizeLegacyQuizz = (data: unknown): unknown => {
  if (!isRecord(data) || !Array.isArray(data.questions)) {
    return data
  }

  return {
    ...data,
    gameMode: data.gameMode ?? QUIZZ_MODES.QUIZ,
    questions: data.questions.map((question: unknown) => {
      if (!isRecord(question)) {
        return question
      }

      return {
        ...question,
        type: question.type ?? QUESTION_TYPES.SINGLE,
        solutions:
          question.solutions === undefined || Array.isArray(question.solutions)
            ? question.solutions
            : [question.solutions],
        ...(isRecord(question.options) &&
        question.type !== QUESTION_TYPES.ESTIMATION &&
        question.type !== QUESTION_TYPES.PUZZLE &&
        question.type !== QUESTION_TYPES.PIN
          ? {
              options: {
                scoringMode: SCORING_MODES.BALANCED,
                ...question.options,
              },
            }
          : {}),
      }
    }),
  }
}
