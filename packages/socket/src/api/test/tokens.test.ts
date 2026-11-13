import fs from "fs"
import { StatusCodes } from "http-status-codes"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import type { ApiTokenMeta } from "@razzia/common/types/auth"
import {
  SESSION_ROLES,
  USER_ROLES,
  API_TOKEN_PREFIX,
} from "@razzia/common/constants"
import { app } from "@razzia/socket/app"
import { mintToken } from "@razzia/socket/services/auth"
import { getPath, initConfig } from "@razzia/socket/services/config"
import { setIo } from "@razzia/socket/services/io"
import { clearRateLimits } from "@razzia/socket/services/rate-limit"
import { createUser, setPassword } from "@razzia/socket/services/users"
import { createFakeIo } from "@razzia/socket/test/fake-io"
import { createQuestion, createQuizz } from "@razzia/socket/test/fixtures"

vi.mock("@razzia/socket/services/opentdb", () => ({
  openTdb: {
    getCategories: vi.fn(() => Promise.resolve([{ id: 9, name: "General" }])),
    generate: vi.fn(() => Promise.resolve([])),
  },
}))

const PASSWORD = "correct-horse"

const request = (
  path: string,
  {
    method = "GET",
    token,
    body,
  }: { method?: string; token?: string; body?: unknown } = {},
) =>
  app.request(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const json = async <T = Record<string, unknown>>(response: Response) =>
  (await response.json()) as T

const addUser = async (
  username: string,
  permissions: { createQuizz?: boolean; editQuizz?: boolean } = {},
  role: (typeof USER_ROLES)[keyof typeof USER_ROLES] = USER_ROLES.USER,
) => {
  const user = await createUser({
    username,
    password: PASSWORD,
    role,
    permissions: {
      createQuizz: false,
      editQuizz: false,
      deleteQuizz: false,
      ...permissions,
    },
  })
  const session = await mintToken(username, SESSION_ROLES.MANAGER, user.id)

  return { user, session: session.token }
}

const makeToken = async (
  session: string,
  body: Record<string, unknown> = { name: "AI tool" },
) =>
  json<ApiTokenMeta & { token: string }>(
    await request("/tokens", { method: "POST", token: session, body }),
  )

beforeAll(() => {
  setIo(createFakeIo().io)
})

beforeEach(() => {
  fs.rmSync(getPath(), { recursive: true, force: true })
  initConfig()
  clearRateLimits()
})

describe("api tokens", () => {
  it("creates a token that is shown once and never stored in plain text", async () => {
    const { session } = await addUser("author", { createQuizz: true })
    const created = await makeToken(session)

    expect(created.token.startsWith(API_TOKEN_PREFIX)).toBe(true)
    expect(created.prefix).toBe(created.token.slice(0, created.prefix.length))
    expect(created.expiresAt).toBeNull()

    const listed = await json<{ tokens: Array<Record<string, unknown>> }>(
      await request("/tokens", { token: session }),
    )

    expect(listed.tokens).toHaveLength(1)
    expect(JSON.stringify(listed)).not.toContain(created.token)
    expect(fs.readFileSync(getPath("api-tokens.json"), "utf-8")).not.toContain(
      created.token,
    )
  })

  it("creates a quizz as the owner with the rights of the user", async () => {
    const { user, session } = await addUser("author", { createQuizz: true })
    const { token } = await makeToken(session)

    const response = await request("/quizz", {
      method: "POST",
      token,
      body: createQuizz([createQuestion()]),
    })

    expect(response.status).toBe(StatusCodes.CREATED)

    const { id } = await json<{ id: string }>(response)

    const detail = await json<{ access: { ownerId: string } }>(
      await request(`/quizz/${id}`, { token }),
    )

    expect(detail.access.ownerId).toBe(user.id)
  })

  it("does not give more rights than the user has", async () => {
    const { session } = await addUser("reader")
    const { token } = await makeToken(session)

    const response = await request("/quizz", {
      method: "POST",
      token,
      body: createQuizz([createQuestion()]),
    })

    expect(response.status).toBe(StatusCodes.FORBIDDEN)
  })

  it("works for the generator but not for accounts, settings or tokens", async () => {
    const { session } = await addUser("admin", {}, USER_ROLES.ADMIN)
    const { token } = await makeToken(session)

    const allowed = await request("/generator/categories", { token })

    expect(allowed.status).toBe(StatusCodes.OK)

    const statuses = await Promise.all(
      ["/users", "/tokens", "/auth/me", "/results", "/media"].map(
        async (path) => (await request(path, { token })).status,
      ),
    )

    expect(statuses).toEqual(Array(5).fill(StatusCodes.UNAUTHORIZED))
  })

  it("rejects unknown, revoked and expired tokens", async () => {
    const { session } = await addUser("author", { createQuizz: true })
    const created = await makeToken(session, { name: "x", expiresInDays: 1 })

    const unknown = await request("/quizz", {
      token: `${API_TOKEN_PREFIX}not-a-real-token`,
    })

    expect(unknown.status).toBe(StatusCodes.UNAUTHORIZED)

    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 2 * 24 * 60 * 60 * 1000)

    const expired = await request("/quizz", { token: created.token })

    vi.useRealTimers()
    expect(expired.status).toBe(StatusCodes.UNAUTHORIZED)

    const fresh = await makeToken(session)

    expect((await request("/quizz", { token: fresh.token })).status).toBe(
      StatusCodes.OK,
    )

    const revoked = await request(`/tokens/${fresh.id}`, {
      method: "DELETE",
      token: session,
    })

    expect(revoked.status).toBe(StatusCodes.NO_CONTENT)
    expect((await request("/quizz", { token: fresh.token })).status).toBe(
      StatusCodes.UNAUTHORIZED,
    )
  })

  it("only lets you revoke your own tokens", async () => {
    const first = await addUser("first")
    const second = await addUser("second")
    const created = await makeToken(first.session)

    const response = await request(`/tokens/${created.id}`, {
      method: "DELETE",
      token: second.session,
    })

    expect(response.status).toBe(StatusCodes.NOT_FOUND)
    expect(
      (
        await json<{ tokens: unknown[] }>(
          await request("/tokens", { token: first.session }),
        )
      ).tokens,
    ).toHaveLength(1)
  })

  it("stops working when the user is deleted or must change the password", async () => {
    const admin = await addUser("admin", {}, USER_ROLES.ADMIN)
    const { user, session } = await addUser("temp", { createQuizz: true })
    const { token } = await makeToken(session)

    await setPassword(user.id, "another-password", true)

    const blocked = await request("/quizz", { token })

    expect(blocked.status).toBe(StatusCodes.FORBIDDEN)
    expect(await json(blocked)).toEqual({
      error: "errors:auth.passwordChangeRequired",
    })

    await setPassword(user.id, "another-password", false)

    expect((await request("/quizz", { token })).status).toBe(StatusCodes.OK)

    await request(`/users/${user.id}`, {
      method: "DELETE",
      token: admin.session,
    })

    expect((await request("/quizz", { token })).status).toBe(
      StatusCodes.UNAUTHORIZED,
    )
    expect(fs.readFileSync(getPath("api-tokens.json"), "utf-8")).toBe("[]")
  })

  it("validates the name and the expiry", async () => {
    const { session } = await addUser("author")

    const statuses = await Promise.all(
      [
        { name: "" },
        { name: "x".repeat(65) },
        { name: "ok", expiresInDays: 0 },
        { name: "ok", expiresInDays: 400 },
      ].map(
        async (body) =>
          (await request("/tokens", { method: "POST", token: session, body }))
            .status,
      ),
    )

    expect(statuses).toEqual(Array(4).fill(StatusCodes.BAD_REQUEST))
  })
})
