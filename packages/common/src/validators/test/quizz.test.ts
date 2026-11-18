import { describe, expect, it } from "vitest"
import type { Question, Quizz } from "@razzia/common/types/game"
import {
  ESTIMATION_INPUT_MODES,
  MEDIA_TYPES,
  QUESTION_TYPES,
  QUIZZ_MODES,
  SCORING_MODES,
} from "@razzia/common/constants"
import {
  backgroundValidator,
  normalizeLegacyQuizz,
  questionMediaValidator,
  quizzValidator,
} from "@razzia/common/validators/quizz"

const choiceQuestion = (overrides: Partial<Question> = {}): Question => ({
  type: QUESTION_TYPES.SINGLE,
  question: "Question ?",
  answers: ["A", "B"],
  solutions: [0],
  cooldown: 5,
  time: 15,
  ...overrides,
})

const estimationQuestion = (overrides: Partial<Question> = {}): Question => ({
  type: QUESTION_TYPES.ESTIMATION,
  question: "How many ?",
  answers: [],
  solutions: [50],
  cooldown: 5,
  time: 15,
  options: {
    inputMode: ESTIMATION_INPUT_MODES.SLIDER,
    min: 0,
    max: 100,
    step: 1,
    margin: 10,
  },
  ...overrides,
})

const quizz = (
  questions: Question[],
  gameMode: Quizz["gameMode"] = QUIZZ_MODES.QUIZ,
): Quizz => ({ gameMode, subject: "Subject", questions })

const issues = (data: unknown) =>
  quizzValidator.safeParse(data).error?.issues.map((issue) => issue.message) ??
  []

describe("quizzValidator", () => {
  it("accepts a valid quizz mixing every question type", () => {
    const data = quizz([
      choiceQuestion(),
      choiceQuestion({
        type: QUESTION_TYPES.MULTI,
        answers: ["A", "B", "C", "D"],
        solutions: [0, 2],
        options: { scoringMode: SCORING_MODES.STRICT },
      }),
      estimationQuestion(),
    ])

    expect(issues(data)).toEqual([])
  })

  it("accepts rounds on questions, with or without a background", () => {
    const data = quizz([
      choiceQuestion({
        round: { name: "Round 1", background: "/media/a.png" },
      }),
      choiceQuestion(),
      choiceQuestion({ round: { name: "Round 2" } }),
    ])

    expect(issues(data)).toEqual([])
  })

  it("keeps working for quizzes without rounds", () => {
    expect(issues(quizz([choiceQuestion(), choiceQuestion()]))).toEqual([])
  })

  it("rejects a round without a name or with a bad background", () => {
    expect(
      issues(quizz([choiceQuestion({ round: { name: "  " } })])),
    ).not.toEqual([])
    expect(
      issues(
        quizz([choiceQuestion({ round: { name: "R", background: "nope" } })]),
      ),
    ).not.toEqual([])
  })

  it("requires at least one question", () => {
    expect(issues(quizz([]))).toContain("errors:quizz.noQuestions")
  })

  it("requires a solution in quiz mode but not in survey mode", () => {
    const question = choiceQuestion({ solutions: [] })

    expect(issues(quizz([question]))).toContain("errors:quizz.noSolution")
    expect(issues(quizz([question], QUIZZ_MODES.SURVEY))).toEqual([])
  })

  it("limits choice questions to 2-4 answers", () => {
    expect(issues(quizz([choiceQuestion({ answers: ["A"] })]))).toContain(
      "errors:quizz.tooFewAnswers",
    )
    expect(
      issues(quizz([choiceQuestion({ answers: ["A", "B", "C", "D", "E"] })])),
    ).toContain("errors:quizz.tooManyAnswers")
  })

  it("accepts 0 max points but no negative points", () => {
    expect(issues(quizz([choiceQuestion({ maxPoints: 0 })]))).toEqual([])
    expect(issues(quizz([choiceQuestion({ maxPoints: -1 })]))).toContain(
      "errors:quizz.maxPointsNegative",
    )
    expect(issues(quizz([choiceQuestion({ penalty: -1 })]))).toContain(
      "errors:quizz.penaltyNegative",
    )
  })

  it("validates the percentages and the speed bonus", () => {
    expect(
      issues(quizz([choiceQuestion({ topPercent: 20, penaltyPercent: 25 })])),
    ).toEqual([])
    expect(issues(quizz([choiceQuestion({ topPercent: 0 })]))).toContain(
      "errors:quizz.topPercentRange",
    )
    expect(issues(quizz([choiceQuestion({ penaltyPercent: 101 })]))).toContain(
      "errors:quizz.penaltyPercentRange",
    )
    expect(
      issues(quizz([choiceQuestion({ penalty: 100, penaltyPercent: 10 })])),
    ).toContain("errors:quizz.penaltyBoth")
    expect(issues({ ...quizz([choiceQuestion()]), speedBonus: 101 })).toContain(
      "errors:quizz.speedBonusRange",
    )
    expect(issues({ ...quizz([choiceQuestion()]), speedBonus: 0 })).toEqual([])
  })

  it("bounds the cooldown between 3 and 15 seconds", () => {
    expect(issues(quizz([choiceQuestion({ cooldown: 2 })]))).toContain(
      "errors:quizz.cooldownTooShort",
    )
    expect(issues(quizz([choiceQuestion({ cooldown: 16 })]))).toContain(
      "errors:quizz.cooldownTooLong",
    )
  })

  it("rejects estimation questions without options", () => {
    expect(
      issues(quizz([estimationQuestion({ options: undefined })])),
    ).toContain("errors:quizz.estimationInvalidOptions")
  })

  it.each([
    [{ step: 0 }, "errors:quizz.estimationStepInvalid"],
    [{ margin: -1 }, "errors:quizz.estimationMarginNegative"],
    [{ min: 100, max: 0 }, "errors:quizz.estimationInvalidRange"],
  ])("rejects invalid estimation options %o", (options, message) => {
    const question = estimationQuestion({
      options: {
        inputMode: ESTIMATION_INPUT_MODES.SLIDER,
        min: 0,
        max: 100,
        step: 1,
        margin: 10,
        ...options,
      },
    })

    expect(issues(quizz([question]))).toContain(message)
  })

  it("rejects an estimation solution outside of the range", () => {
    expect(issues(quizz([estimationQuestion({ solutions: [101] })]))).toContain(
      "errors:quizz.estimationSolutionOutOfRange",
    )
  })
})

describe("questionMediaValidator", () => {
  it.each(["/media/picture.png", "https://example.com/picture.png"])(
    "accepts %s",
    (url) => {
      expect(questionMediaValidator.safeParse({ url }).success).toBe(true)
    },
  )

  it.each(["picture.png", "/other/picture.png"])("rejects %s", (url) => {
    expect(questionMediaValidator.safeParse({ url }).success).toBe(false)
  })
})

describe("normalizeLegacyQuizz", () => {
  it("upgrades a quizz written by an older version", () => {
    const legacy = {
      subject: "Old",
      questions: [
        {
          question: "Q",
          answers: ["A", "B"],
          solutions: 1,
          cooldown: 5,
          time: 15,
          options: {},
        },
      ],
    }

    const normalized = normalizeLegacyQuizz(legacy)

    expect(normalized).toMatchObject({
      gameMode: QUIZZ_MODES.QUIZ,
      questions: [
        {
          type: QUESTION_TYPES.SINGLE,
          solutions: [1],
          options: { scoringMode: SCORING_MODES.BALANCED },
        },
      ],
    })
    expect(quizzValidator.safeParse(normalized).success).toBe(true)
  })

  it("leaves estimation options untouched", () => {
    const question = estimationQuestion()
    const normalized = normalizeLegacyQuizz(quizz([question])) as Quizz

    expect(normalized.questions[0].options).toEqual(question.options)
  })

  it("returns unknown data as is", () => {
    expect(normalizeLegacyQuizz("not a quizz")).toBe("not a quizz")
  })
})

describe("backgrounds", () => {
  it("accepts library and external image URLs", () => {
    expect(backgroundValidator.safeParse("/media/a.png").success).toBe(true)
    expect(backgroundValidator.safeParse("https://x.nl/a.png").success).toBe(
      true,
    )
    expect(backgroundValidator.safeParse("data:text/html,x").success).toBe(
      false,
    )
  })

  it("keeps question and quizz backgrounds through validation", () => {
    const result = quizzValidator.parse({
      gameMode: QUIZZ_MODES.QUIZ,
      subject: "S",
      background: "/media/quizz.png",
      questions: [choiceQuestion({ background: "/media/q.png" })],
    })

    expect(result.background).toBe("/media/quizz.png")
    expect(result.questions[0].background).toBe("/media/q.png")
  })
})

describe("puzzle question", () => {
  const puzzleQuestion = (overrides: Partial<Question> = {}): Question => ({
    type: QUESTION_TYPES.PUZZLE,
    question: "Connections ?",
    answers: Array.from({ length: 12 }, (_, i) => `Word ${i}`),
    cooldown: 5,
    time: 60,
    options: { connections: [["A"], ["B", "b"], ["C"]] },
    ...overrides,
  })

  it("is valid without solutions", () => {
    expect(issues(quizz([puzzleQuestion()]))).toEqual([])
  })

  it("needs exactly 12 words", () => {
    expect(
      issues(quizz([puzzleQuestion({ answers: ["A", "B", "C", "D"] })])),
    ).toContain("errors:quizz.puzzleWordCount")
  })

  it("needs a connection for every group", () => {
    expect(
      issues(
        quizz([
          puzzleQuestion({ options: { connections: [["A"], [" "], ["C"]] } }),
        ]),
      ),
    ).toContain("errors:quizz.puzzleConnectionEmpty")
    expect(
      issues(quizz([puzzleQuestion({ options: { connections: [["A"]] } })])),
    ).toContain("errors:quizz.puzzleInvalidOptions")
  })

  it("is not allowed in a survey", () => {
    expect(issues(quizz([puzzleQuestion()], QUIZZ_MODES.SURVEY))).toContain(
      "errors:quizz.puzzleNeedsQuiz",
    )
  })

  it("keeps its options when parsed", () => {
    const parsed = quizzValidator.safeParse(quizz([puzzleQuestion()]))

    expect(parsed.data?.questions[0].options).toEqual({
      connections: [["A"], ["B", "b"], ["C"]],
    })
  })
})

describe("pin question", () => {
  const pinQuestion = (overrides: Partial<Question> = {}): Question => ({
    type: QUESTION_TYPES.PIN,
    question: "Where is Paris ?",
    answers: [],
    media: { type: MEDIA_TYPES.IMAGE, url: "/media/map.png" },
    cooldown: 5,
    time: 30,
    options: { x: 38, y: 62, radius: 3, maxDistance: 40 },
    ...overrides,
  })

  it("is valid without solutions", () => {
    expect(issues(quizz([pinQuestion()]))).toEqual([])
  })

  it("needs an image", () => {
    expect(issues(quizz([pinQuestion({ media: undefined })]))).toContain(
      "errors:quizz.pinNeedsImage",
    )
  })

  it("needs a maximum distance beyond the radius", () => {
    expect(
      issues(
        quizz([
          pinQuestion({ options: { x: 1, y: 1, radius: 10, maxDistance: 5 } }),
        ]),
      ),
    ).toContain("errors:quizz.pinMaxDistanceTooSmall")
  })

  it("needs no image on a real map", () => {
    expect(
      issues(
        quizz([
          pinQuestion({
            media: undefined,
            options: {
              mode: "map",
              x: 4.9,
              y: 52.37,
              radius: 25,
              maxDistance: 500,
              view: { lat: 50, lng: 5, zoom: 4 },
            },
          }),
        ]),
      ),
    ).toEqual([])
  })

  it("keeps the right spot on the image", () => {
    expect(
      issues(
        quizz([
          pinQuestion({
            options: { x: 150, y: 10, radius: 1, maxDistance: 5 },
          }),
        ]),
      ),
    ).toContain("errors:quizz.pinInvalidOptions")
  })

  it("is not allowed in a survey", () => {
    expect(issues(quizz([pinQuestion()], QUIZZ_MODES.SURVEY))).toContain(
      "errors:quizz.pinNeedsQuiz",
    )
  })

  it("keeps its options when parsed", () => {
    const parsed = quizzValidator.safeParse(quizz([pinQuestion()]))

    expect(parsed.data?.questions[0].options).toEqual({
      x: 38,
      y: 62,
      radius: 3,
      maxDistance: 40,
    })
  })
})
