import fs from "fs"
import { StatusCodes } from "http-status-codes"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { SESSION_ROLES, USER_ROLES } from "@razzia/common/constants"
import { app } from "@razzia/socket/app"
import { createApiToken } from "@razzia/socket/services/api-tokens"
import { mintToken } from "@razzia/socket/services/auth"
import { getPath, initConfig } from "@razzia/socket/services/config"
import { setIo } from "@razzia/socket/services/io"
import { clearRateLimits } from "@razzia/socket/services/rate-limit"
import { createUser } from "@razzia/socket/services/users"
import { createFakeIo } from "@razzia/socket/test/fake-io"
import { createQuestion, createQuizz } from "@razzia/socket/test/fixtures"

const generate = vi.fn(() =>
  Promise.resolve([
    {
      type: "single",
      question: "Q?",
      answers: ["A", "B"],
      solutions: [1],
      cooldown: 5,
      time: 20,
    },
  ]),
)

vi.mock("@razzia/socket/services/opentdb", () => ({
  openTdb: {
    getCategories: vi.fn(() => Promise.resolve([{ id: 9, name: "General" }])),
    generate: (...args: unknown[]) => generate(...(args as [])),
  },
}))

interface RpcResult {
  result?: {
    isError?: boolean
    content?: Array<{ text: string }>
    tools?: Array<{ name: string }>
  }
  error?: { message: string }
}

let nextId = 1

const rpc = async (
  token: string | undefined,
  method: string,
  params?: unknown,
) => {
  const response = await app.request("/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: (nextId += 1), method, params }),
  })

  return { status: response.status, body: (await response.json()) as RpcResult }
}

const callTool = async (
  token: string,
  name: string,
  args: Record<string, unknown> = {},
) => {
  const { body } = await rpc(token, "tools/call", { name, arguments: args })

  return {
    isError: body.result?.isError ?? false,
    texts: (body.result?.content ?? []).map((part) => part.text),
  }
}

const tokenFor = async (
  username: string,
  permissions: { createQuizz?: boolean } = {},
  role: (typeof USER_ROLES)[keyof typeof USER_ROLES] = USER_ROLES.USER,
) => {
  const user = await createUser({
    username,
    password: "correct-horse",
    role,
    permissions: {
      createQuizz: false,
      editQuizz: false,
      deleteQuizz: false,
      ...permissions,
    },
  })

  return createApiToken(user.id, { name: "mcp" }).token
}

beforeAll(() => {
  setIo(createFakeIo().io)
})

beforeEach(() => {
  fs.rmSync(getPath(), { recursive: true, force: true })
  initConfig()
  clearRateLimits()
  generate.mockClear()
})

describe("mcp endpoint", () => {
  it("needs an API token, not a manager session", async () => {
    const user = await createUser({
      username: "u",
      password: "correct-horse",
      role: USER_ROLES.ADMIN,
    })
    const session = (await mintToken("u", SESSION_ROLES.MANAGER, user.id)).token

    expect((await rpc(undefined, "tools/list")).status).toBe(
      StatusCodes.UNAUTHORIZED,
    )
    expect((await rpc(session, "tools/list")).status).toBe(
      StatusCodes.UNAUTHORIZED,
    )
    expect((await rpc("razzia_unknown", "tools/list")).status).toBe(
      StatusCodes.UNAUTHORIZED,
    )
  })

  it("lists the quiz tools", async () => {
    const token = await tokenFor("author", { createQuizz: true })
    const { body } = await rpc(token, "tools/list")

    expect(body.result?.tools?.map((tool) => tool.name).sort()).toEqual([
      "create_quiz",
      "delete_quiz",
      "generate_questions",
      "get_quiz",
      "get_quiz_schema",
      "list_question_categories",
      "list_quizzes",
      "update_quiz",
    ])
  })

  it("describes the quiz format", async () => {
    const token = await tokenFor("author")
    const { texts, isError } = await callTool(token, "get_quiz_schema")

    expect(isError).toBe(false)
    expect(texts[0]).toContain("solutions")
    expect(texts[0]).toContain('"gameMode"')
  })

  it("creates, reads, updates and deletes a quiz with the user's rights", async () => {
    const token = await tokenFor("admin", {}, USER_ROLES.ADMIN)
    const quiz = createQuizz([createQuestion()])

    const created = await callTool(token, "create_quiz", { quiz })

    expect(created.isError).toBe(false)

    const { id } = JSON.parse(created.texts[0]) as { id: string }
    const read = await callTool(token, "get_quiz", { id })

    expect(JSON.parse(read.texts[0])).toMatchObject({
      id,
      subject: quiz.subject,
    })

    const updated = await callTool(token, "update_quiz", {
      id,
      quiz: { ...quiz, subject: "Renamed" },
    })

    expect(updated.isError).toBe(false)
    expect(
      (
        JSON.parse((await callTool(token, "list_quizzes")).texts[0]) as {
          quizz: unknown[]
        }
      ).quizz,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id, subject: "Renamed" }),
      ]),
    )

    expect((await callTool(token, "delete_quiz", { id })).isError).toBe(false)
    expect((await callTool(token, "get_quiz", { id })).isError).toBe(true)
  })

  it("reports validation and permission errors as tool errors", async () => {
    const reader = await tokenFor("reader")
    const author = await tokenFor("author", { createQuizz: true })

    const forbidden = await callTool(reader, "create_quiz", {
      quiz: createQuizz([createQuestion()]),
    })

    expect(forbidden.isError).toBe(true)
    expect(forbidden.texts[0]).toContain("errors:auth.forbidden")

    const invalid = await callTool(author, "create_quiz", {
      quiz: { gameMode: "quiz", subject: "x", questions: [] },
    })

    expect(invalid.isError).toBe(true)
    expect(invalid.texts[0]).toContain("errors:quizz.noQuestions")
  })

  it("adds translation instructions only for another language", async () => {
    const token = await tokenFor("author", { createQuizz: true })

    const english = await callTool(token, "generate_questions", { amount: 1 })

    expect(english.texts).toHaveLength(1)

    const dutch = await callTool(token, "generate_questions", {
      amount: 1,
      language: "Dutch",
    })

    expect(dutch.texts).toHaveLength(2)
    expect(dutch.texts[1]).toContain('"Dutch"')
    expect(dutch.texts[1]).toContain("wordplay")
    expect(dutch.texts[1]).toContain('"solutions" still points')
    expect(generate).toHaveBeenCalledTimes(2)
    expect(
      (JSON.parse(dutch.texts[0]) as { questions: unknown[] }).questions,
    ).toHaveLength(1)
  })
})
