// Upstream calls are sequential by design (one request per 5 seconds).
/* oxlint-disable no-await-in-loop */
import { randomInt } from "crypto"
import type { Question } from "@razzia/common/types/game"
import type {
  GeneratorInput,
  TriviaCategory,
} from "@razzia/common/validators/generator"
import { OPENTDB_URL, QUESTION_TYPES } from "@razzia/common/constants"
import {
  invalidInput,
  serverError,
  tooManyRequests,
  notFound,
} from "@razzia/socket/services/errors"

/** Open Trivia DB allows one request per IP every 5 seconds. */
const MIN_INTERVAL_MS = 5200
const RATE_LIMIT_BACKOFF_MS = 5500
const MAX_RATE_LIMIT_RETRIES = 2
const MAX_QUEUE_LENGTH = 4
const REQUEST_TIMEOUT_MS = 10_000
/** Tokens are deleted by Open Trivia DB after 6 hours of inactivity. */
const TOKEN_TTL_MS = 5 * 60 * 60 * 1000
const CATEGORIES_TTL_MS = 24 * 60 * 60 * 1000

const QUESTION_TIME = 20
const QUESTION_COOLDOWN = 5

const RESPONSE_CODE = {
  SUCCESS: 0,
  NO_RESULTS: 1,
  INVALID_PARAMETER: 2,
  TOKEN_NOT_FOUND: 3,
  TOKEN_EMPTY: 4,
  RATE_LIMIT: 5,
} as const

interface ApiQuestion {
  type: string
  difficulty: string
  category: string
  question: string
  correct_answer: string
  incorrect_answers: string[]
}

interface QuestionsResponse {
  response_code: number
  results?: ApiQuestion[]
}

interface TokenResponse {
  response_code: number
  token?: string
}

interface CategoryResponse {
  trivia_categories: TriviaCategory[]
}

interface CountResponse {
  category_question_count: {
    total_question_count: number
    total_easy_question_count: number
    total_medium_question_count: number
    total_hard_question_count: number
  }
}

export interface OpenTdbDeps {
  fetch: (url: string, init?: { signal?: AbortSignal }) => Promise<Response>
  sleep: (ms: number) => Promise<void>
  now: () => number
}

const defaultDeps: OpenTdbDeps = {
  fetch: (url, init) => fetch(url, init),
  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms)
    }),
  now: () => Date.now(),
}

const decode = (value: string): string =>
  Buffer.from(value, "base64").toString("utf-8")

const shuffle = <T>(items: T[]): T[] => {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)

    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

/** Turns one (base64 encoded) Open Trivia DB question into a quizz question. */
export const mapQuestion = (raw: ApiQuestion): Question => {
  const correct = decode(raw.correct_answer)
  const incorrect = raw.incorrect_answers.map(decode)
  const isBoolean = raw.type === "boolean"

  // True/False keeps its natural order, multiple choice is shuffled.
  const answers = isBoolean
    ? ["True", "False"]
    : shuffle([correct, ...incorrect])

  return {
    type: QUESTION_TYPES.SINGLE,
    question: decode(raw.question),
    category: decode(raw.category),
    answers,
    solutions: [answers.indexOf(correct)],
    cooldown: QUESTION_COOLDOWN,
    time: QUESTION_TIME,
  }
}

export const createOpenTdbClient = (deps: OpenTdbDeps = defaultDeps) => {
  let lastCallAt = 0
  let pending = 0
  let chain: Promise<unknown> = Promise.resolve()
  const tokens = new Map<string, { token: string; at: number }>()
  let categories: { list: TriviaCategory[]; at: number } | null = null

  /** Runs calls one at a time, spaced to stay below the upstream rate limit. */
  const schedule = <T>(task: () => Promise<T>): Promise<T> => {
    if (pending >= MAX_QUEUE_LENGTH) {
      return Promise.reject(tooManyRequests("errors:generator.busy"))
    }

    pending += 1

    const run = async () => {
      try {
        const wait = lastCallAt + MIN_INTERVAL_MS - deps.now()

        if (wait > 0) {
          await deps.sleep(wait)
        }

        lastCallAt = deps.now()

        return await task()
      } finally {
        pending -= 1
      }
    }

    const result = chain.then(run, run)

    chain = result.catch(() => undefined)

    return result
  }

  const call = <T>(path: string, params: Record<string, string | number>) =>
    schedule(async (): Promise<T> => {
      const url = new URL(`${OPENTDB_URL}/${path}`)

      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value))
      }

      try {
        const response = await deps.fetch(url.toString(), {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })

        if (response.status === 429) {
          return { response_code: RESPONSE_CODE.RATE_LIMIT } as T
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return (await response.json()) as T
      } catch (error) {
        console.error("Open Trivia DB request failed:", error)

        throw serverError("errors:generator.unavailable")
      }
    })

  const requestToken = async (userId: string): Promise<string> => {
    const data = await call<TokenResponse>("api_token.php", {
      command: "request",
    })

    if (data.response_code !== RESPONSE_CODE.SUCCESS || !data.token) {
      throw serverError("errors:generator.unavailable")
    }

    tokens.set(userId, { token: data.token, at: deps.now() })

    return data.token
  }

  const getToken = (userId: string): Promise<string> => {
    const cached = tokens.get(userId)

    if (cached && deps.now() - cached.at < TOKEN_TTL_MS) {
      return Promise.resolve(cached.token)
    }

    return requestToken(userId)
  }

  const resetToken = async (userId: string, token: string): Promise<void> => {
    const data = await call<TokenResponse>("api_token.php", {
      command: "reset",
      token,
    })

    if (data.response_code !== RESPONSE_CODE.SUCCESS) {
      tokens.delete(userId)
    } else {
      tokens.set(userId, { token, at: deps.now() })
    }
  }

  const getCategories = async (): Promise<TriviaCategory[]> => {
    if (categories && deps.now() - categories.at < CATEGORIES_TTL_MS) {
      return categories.list
    }

    const data = await call<CategoryResponse>("api_category.php", {})

    if (!Array.isArray(data.trivia_categories)) {
      throw serverError("errors:generator.unavailable")
    }

    categories = { list: data.trivia_categories, at: deps.now() }

    return categories.list
  }

  const availableQuestions = async (input: GeneratorInput): Promise<number> => {
    if (!input.category) {
      return 0
    }

    const data = await call<CountResponse>("api_count.php", {
      category: input.category,
    })
    const counts = data.category_question_count

    const byDifficulty = {
      easy: counts.total_easy_question_count,
      medium: counts.total_medium_question_count,
      hard: counts.total_hard_question_count,
    }

    return input.difficulty
      ? byDifficulty[input.difficulty]
      : counts.total_question_count
  }

  const fetchQuestions = async (
    userId: string,
    input: GeneratorInput,
  ): Promise<ApiQuestion[]> => {
    let { amount } = input
    let tokenRetried = false
    let emptyRetried = false
    let countRetried = false
    let rateLimitRetries = 0

    for (;;) {
      const token = await getToken(userId)
      const data = await call<QuestionsResponse>("api.php", {
        amount,
        token,
        encode: "base64",
        ...(input.category ? { category: input.category } : {}),
        ...(input.difficulty ? { difficulty: input.difficulty } : {}),
        ...(input.type ? { type: input.type } : {}),
      })

      switch (data.response_code) {
        case RESPONSE_CODE.SUCCESS:
          if (!data.results?.length) {
            throw notFound("errors:generator.noResults")
          }

          return data.results

        case RESPONSE_CODE.NO_RESULTS: {
          // Fewer questions available than asked for: retry with what exists.
          if (!countRetried) {
            countRetried = true

            const available = await availableQuestions(input)

            if (available > 0 && available < amount) {
              amount = available

              continue
            }
          }

          throw notFound("errors:generator.noResults")
        }

        case RESPONSE_CODE.INVALID_PARAMETER:
          throw invalidInput("errors:generator.invalidParameter")

        case RESPONSE_CODE.TOKEN_NOT_FOUND:
          if (tokenRetried) {
            throw serverError("errors:generator.unavailable")
          }

          tokenRetried = true
          tokens.delete(userId)

          continue

        case RESPONSE_CODE.TOKEN_EMPTY:
          // Every question for this filter was already served to this user.
          if (emptyRetried) {
            throw notFound("errors:generator.exhausted")
          }

          emptyRetried = true
          await resetToken(userId, token)

          continue

        case RESPONSE_CODE.RATE_LIMIT:
          if (rateLimitRetries >= MAX_RATE_LIMIT_RETRIES) {
            throw tooManyRequests("errors:generator.rateLimited")
          }

          rateLimitRetries += 1
          await deps.sleep(RATE_LIMIT_BACKOFF_MS)

          continue

        default:
          throw serverError("errors:generator.unavailable")
      }
    }
  }

  const generate = async (
    userId: string,
    input: GeneratorInput,
  ): Promise<Question[]> => {
    const results = await fetchQuestions(userId, input)

    return results.map(mapQuestion)
  }

  return { generate, getCategories }
}

export const openTdb = createOpenTdbClient()
