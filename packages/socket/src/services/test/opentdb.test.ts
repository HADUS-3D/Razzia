import { describe, expect, it, vi } from "vitest"
import { DomainError } from "@razzia/socket/services/errors"
import {
  buildSubject,
  createOpenTdbClient,
  mapQuestion,
  type OpenTdbDeps,
} from "@razzia/socket/services/opentdb"

const b64 = (value: string) => Buffer.from(value, "utf-8").toString("base64")

const apiQuestion = (overrides = {}) => ({
  type: "multiple",
  difficulty: "easy",
  category: b64("Science: Computers"),
  question: b64("Who wrote π & more?"),
  correct_answer: b64("Right"),
  incorrect_answers: [b64("A"), b64("B"), b64("C")],
  ...overrides,
})

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status })

const setup = (responses: Response[]) => {
  let time = 1_000_000
  const calls: string[] = []
  const deps: OpenTdbDeps = {
    fetch: vi.fn((url: string) => {
      calls.push(url)

      const next = responses.shift()

      if (!next) {
        throw new Error("unexpected request")
      }

      return Promise.resolve(next)
    }),
    sleep: vi.fn((ms: number) => {
      time += ms

      return Promise.resolve()
    }),
    now: () => time,
  }

  return { client: createOpenTdbClient(deps), deps, calls }
}

const expectKey = async (promise: Promise<unknown>, key: string) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )

  expect(error).toBeInstanceOf(DomainError)
  expect((error as DomainError).key).toBe(key)
}

describe("mapQuestion", () => {
  it("decodes, shuffles and points to the correct answer", () => {
    const question = mapQuestion(apiQuestion())

    expect(question.question).toBe("Who wrote π & more?")
    expect(question.category).toBe("Science: Computers")
    expect(question.answers.toSorted()).toEqual(["A", "B", "C", "Right"])
    expect(question.answers[question.solutions?.[0] ?? -1]).toBe("Right")
  })

  it("keeps true/false in order with the right solution", () => {
    const question = mapQuestion(
      apiQuestion({
        type: "boolean",
        correct_answer: b64("False"),
        incorrect_answers: [b64("True")],
      }),
    )

    expect(question.answers).toEqual(["True", "False"])
    expect(question.solutions).toEqual([1])
  })
})

describe("buildSubject", () => {
  it("uses the given subject or builds one", () => {
    expect(buildSubject({ subject: "Mine" }, "Art")).toBe("Mine")
    expect(buildSubject({ difficulty: "hard" }, "Art")).toBe(
      "Trivia: Art (hard)",
    )
    expect(buildSubject({}, undefined)).toBe("Trivia: Mixed")
  })
})

describe("generate", () => {
  const ok = { response_code: 0, results: [apiQuestion()] }
  const token = { response_code: 0, token: "tok" }

  it("requests a token, fetches base64 questions and builds a quizz", async () => {
    const { client, calls } = setup([json(token), json(ok)])
    const quizz = await client.generate("u1", { amount: 1, difficulty: "easy" })

    expect(quizz.source).toBe("opentdb")
    expect(quizz.questions).toHaveLength(1)
    expect(calls[1]).toContain("encode=base64")
    expect(calls[1]).toContain("token=tok")
    expect(calls[1]).toContain("difficulty=easy")
  })

  it("reuses the token for the same user", async () => {
    const { client, calls } = setup([json(token), json(ok), json(ok)])

    await client.generate("u1", { amount: 1 })
    await client.generate("u1", { amount: 1 })

    expect(calls.filter((c) => c.includes("api_token"))).toHaveLength(1)
  })

  it("spaces upstream calls by more than 5 seconds", async () => {
    const { client, deps } = setup([json(token), json(ok)])

    await client.generate("u1", { amount: 1 })

    expect(deps.sleep).toHaveBeenCalledWith(expect.any(Number))
  })

  it("requests a new token on code 3", async () => {
    const { client, calls } = setup([
      json(token),
      json({ response_code: 3 }),
      json({ response_code: 0, token: "new" }),
      json(ok),
    ])

    await client.generate("u1", { amount: 1 })

    expect(calls[3]).toContain("token=new")
  })

  it("resets the token on code 4 and gives up when still empty", async () => {
    const { client } = setup([
      json(token),
      json({ response_code: 4 }),
      json(token),
      json({ response_code: 4 }),
    ])

    await expectKey(
      client.generate("u1", { amount: 1 }),
      "errors:generator.exhausted",
    )
  })

  it("lowers the amount on code 1 when the category has fewer questions", async () => {
    const { client, calls } = setup([
      json(token),
      json({ response_code: 1 }),
      json({
        category_question_count: {
          total_question_count: 20,
          total_easy_question_count: 10,
          total_medium_question_count: 5,
          total_hard_question_count: 5,
        },
      }),
      json(ok),
      json({ trivia_categories: [{ id: 9, name: "General Knowledge" }] }),
    ])
    const quizz = await client.generate("u1", { amount: 50, category: 9 })

    expect(calls[3]).toContain("amount=20")
    expect(quizz.subject).toBe("Trivia: General Knowledge")
  })

  it("reports code 1 without a category as no results", async () => {
    const { client } = setup([json(token), json({ response_code: 1 })])

    await expectKey(
      client.generate("u1", { amount: 50 }),
      "errors:generator.noResults",
    )
  })

  it("maps code 2 and rate limit exhaustion", async () => {
    const invalid = setup([json(token), json({ response_code: 2 })])

    await expectKey(
      invalid.client.generate("u1", { amount: 1 }),
      "errors:generator.invalidParameter",
    )

    const limited = setup([
      json(token),
      json({ response_code: 5 }),
      json({ response_code: 5 }),
      json({ response_code: 5 }),
    ])

    await expectKey(
      limited.client.generate("u1", { amount: 1 }),
      "errors:generator.rateLimited",
    )
  })

  it("reports an unreachable service", async () => {
    const { client } = setup([new Response("x", { status: 503 })])

    await expectKey(
      client.generate("u1", { amount: 1 }),
      "errors:generator.unavailable",
    )
  })

  it("caches categories", async () => {
    const { client, calls } = setup([
      json({ trivia_categories: [{ id: 9, name: "General Knowledge" }] }),
    ])

    await client.getCategories()
    await client.getCategories()

    expect(calls).toHaveLength(1)
  })
})
