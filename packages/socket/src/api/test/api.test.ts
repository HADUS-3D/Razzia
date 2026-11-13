import fs from "fs"
import { StatusCodes } from "http-status-codes"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import type {
  PublicUser,
  SessionResponse,
  UserPermissions,
  UserRole,
} from "@razzia/common/types/auth"
import type { QuizzMeta } from "@razzia/common/types/game"
import {
  QUIZZ_MODES,
  SESSION_ROLES,
  USER_ROLES,
} from "@razzia/common/constants"
import { app } from "@razzia/socket/app"
import { mintToken, verifyJoinTicket } from "@razzia/socket/services/auth"
import {
  getPath,
  getQuizz,
  initConfig,
  saveQuizz,
  saveResult,
} from "@razzia/socket/services/config"
import { setIo } from "@razzia/socket/services/io"
import { clearRateLimits } from "@razzia/socket/services/rate-limit"
import Registry from "@razzia/socket/services/registry"
import { createUser } from "@razzia/socket/services/users"
import { createFakeIo } from "@razzia/socket/test/fake-io"
import { createQuestion, createQuizz } from "@razzia/socket/test/fixtures"

vi.mock("@razzia/socket/services/opentdb", () => ({
  openTdb: {
    getCategories: vi.fn(() =>
      Promise.resolve([{ id: 9, name: "General Knowledge" }]),
    ),
    generate: vi.fn(() =>
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
    ),
  },
}))

interface RequestOptions {
  method?: string
  token?: string
  body?: unknown
}

const request = (
  path: string,
  { method = "GET", token, body }: RequestOptions = {},
) =>
  app.request(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const PNG_BYTES = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000",
  "hex",
)

const upload = (file: File) => {
  const form = new FormData()

  form.append("file", file)

  return app.request("/api/media", {
    method: "POST",
    headers: { Authorization: `Bearer ${managerToken}` },
    body: form,
  })
}

const json = async <T = Record<string, unknown>>(response: Response) =>
  (await response.json()) as T

let managerToken = ""
let playerToken = ""
let adminId = ""

const PASSWORD = "correct-horse"

const tokenFor = async (sub: string, userId: string) =>
  (await mintToken(sub, SESSION_ROLES.MANAGER, userId)).token

const addUser = async (
  username: string,
  permissions: Partial<UserPermissions> = {},
  role: UserRole = USER_ROLES.USER,
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

  return { user, token: await tokenFor(username, user.id) }
}

const createGame = async () => {
  const { id: quizzId } = saveQuizz(createQuizz([createQuestion()]))
  const response = await request("/games", {
    method: "POST",
    token: managerToken,
    body: { quizzId },
  })

  return json<{ gameId: string; inviteCode: string }>(response)
}

beforeAll(async () => {
  setIo(createFakeIo().io)
  playerToken = (await mintToken("player", SESSION_ROLES.PLAYER)).token
})

beforeEach(async () => {
  fs.rmSync(getPath(), { recursive: true, force: true })
  initConfig()
  clearRateLimits()

  const admin = await addUser("admin", {}, USER_ROLES.ADMIN)

  adminId = admin.user.id
  managerToken = admin.token
})

afterEach(() => {
  vi.useRealTimers()
  Registry.getInstance()
    .getAllGames()
    .forEach((game) => {
      Registry.getInstance().removeGame(game.gameId)
    })
})

describe("auth", () => {
  it("creates a player session and keeps a valid one", async () => {
    const created = await json<SessionResponse>(
      await request("/auth/session", { method: "POST", body: {} }),
    )

    expect(created.role).toBe(SESSION_ROLES.PLAYER)

    const kept = await json<SessionResponse>(
      await request("/auth/session", {
        method: "POST",
        body: { token: created.token },
      }),
    )

    expect(kept.token).toBe(created.token)
  })

  it("renews an expired session as a player with the same client id", async () => {
    vi.useFakeTimers()

    const { token } = await mintToken("client", SESSION_ROLES.MANAGER)

    vi.advanceTimersByTime(13 * 60 * 60 * 1000)

    const renewed = await json<SessionResponse>(
      await request("/auth/session", { method: "POST", body: { token } }),
    )

    expect(renewed).toMatchObject({
      clientId: "client",
      role: SESSION_ROLES.PLAYER,
    })
  })

  it("logs in with the right credentials only", async () => {
    const wrong = await request("/auth/login", {
      method: "POST",
      body: { username: "admin", password: "wrong-password" },
    })

    expect(wrong.status).toBe(StatusCodes.FORBIDDEN)
    expect(await json(wrong)).toEqual({
      error: "errors:auth.invalidCredentials",
    })

    const unknown = await request("/auth/login", {
      method: "POST",
      body: { username: "nobody", password: PASSWORD },
    })

    expect(unknown.status).toBe(StatusCodes.FORBIDDEN)

    const right = await request("/auth/login", {
      method: "POST",
      token: playerToken,
      body: { username: "ADMIN", password: PASSWORD },
    })

    expect(await json(right)).toMatchObject({
      clientId: "player",
      role: SESSION_ROLES.MANAGER,
    })
  })

  it("locks a username after too many failed logins", async () => {
    const attempt = async (password: string) =>
      await request("/auth/login", {
        method: "POST",
        body: { username: "admin", password },
      })

    const failures = await Promise.all(
      Array.from({ length: 5 }, () => attempt("wrong-password")),
    )

    expect(failures.map((r) => r.status)).toEqual(
      Array.from({ length: 5 }, () => StatusCodes.FORBIDDEN),
    )

    expect((await attempt(PASSWORD)).status).toBe(StatusCodes.TOO_MANY_REQUESTS)
  })

  it("only offers the first-setup screen while there are no users", async () => {
    expect(await json(await request("/auth/status"))).toEqual({
      needsSetup: false,
    })

    fs.rmSync(getPath("users.json"))

    expect(await json(await request("/auth/status"))).toEqual({
      needsSetup: true,
    })
  })

  it("creates the first admin with the setup code and adopts old quizzes", async () => {
    fs.rmSync(getPath("users.json"))

    const setup = (setupCode: string) =>
      request("/auth/setup", {
        method: "POST",
        body: { username: "first", password: PASSWORD, setupCode },
      })

    expect((await setup("wrong")).status).toBe(StatusCodes.FORBIDDEN)

    const created = await setup("test-password")

    expect(created.status).toBe(StatusCodes.CREATED)

    const { token } = await json<SessionResponse>(created)
    const me = await json<PublicUser>(await request("/auth/me", { token }))

    expect(me).toMatchObject({ username: "first", role: USER_ROLES.ADMIN })

    const list = await json<{ quizz: QuizzMeta[] }>(
      await request("/quizz", { token }),
    )

    expect(list.quizz.every((q) => q.ownerId === me.id)).toBe(true)
    expect((await setup("test-password")).status).toBe(StatusCodes.CONFLICT)
  })

  it("blocks everything but a password change after a reset", async () => {
    const { user } = await addUser("temp")

    await request(`/users/${user.id}/reset-password`, {
      method: "POST",
      token: managerToken,
      body: { password: "temporary-pass" },
    })

    const token = await tokenFor("temp", user.id)

    expect((await request("/quizz", { token })).status).toBe(
      StatusCodes.FORBIDDEN,
    )

    const changed = await request("/auth/password", {
      method: "PATCH",
      token,
      body: {
        currentPassword: "temporary-pass",
        newPassword: "brand-new-pass",
      },
    })

    expect(changed.status).toBe(StatusCodes.OK)
    expect((await request("/quizz", { token })).status).toBe(StatusCodes.OK)
  })

  it("downgrades the session to a player on logout", async () => {
    const response = await request("/auth/logout", {
      method: "POST",
      token: managerToken,
    })

    expect(await json(response)).toMatchObject({
      clientId: "admin",
      role: SESSION_ROLES.PLAYER,
    })
  })
})

describe("manager routes", () => {
  it.each(["/quizz", "/results", "/media"])(
    "%s rejects players and anonymous users",
    async (path) => {
      expect((await request(path)).status).toBe(StatusCodes.UNAUTHORIZED)
      expect((await request(path, { token: playerToken })).status).toBe(
        StatusCodes.UNAUTHORIZED,
      )
    },
  )

  it("manages quizz", async () => {
    const created = await request("/quizz", {
      method: "POST",
      token: managerToken,
      body: createQuizz([createQuestion()]),
    })

    expect(created.status).toBe(StatusCodes.CREATED)

    const { id } = await json<{ id: string }>(created)
    const fetched = await request(`/quizz/${id}`, { token: managerToken })

    expect(await json(fetched)).toMatchObject({ id, subject: "Test quizz" })

    const deleted = await request(`/quizz/${id}`, {
      method: "DELETE",
      token: managerToken,
    })

    expect(deleted.status).toBe(StatusCodes.NO_CONTENT)

    const missing = await request(`/quizz/${id}`, { token: managerToken })

    expect(missing.status).toBe(StatusCodes.NOT_FOUND)
    expect(await json(missing)).toEqual({ error: "errors:quizz.notFound" })
  })

  it("returns the translated validation error", async () => {
    const response = await request("/quizz", {
      method: "POST",
      token: managerToken,
      body: createQuizz([]),
    })

    expect(response.status).toBe(StatusCodes.BAD_REQUEST)
    expect(await json(response)).toEqual({ error: "errors:quizz.noQuestions" })
  })
})

describe("games", () => {
  it("creates a game from an existing quizz", async () => {
    const missing = await request("/games", {
      method: "POST",
      token: managerToken,
      body: { quizzId: "missing" },
    })

    expect(missing.status).toBe(StatusCodes.NOT_FOUND)

    const { gameId, inviteCode } = await createGame()

    expect(inviteCode).toMatch(/^\d{6}$/u)
    expect(Registry.getInstance().getGameById(gameId)).toBeDefined()
  })

  it("only lets the game manager update the settings", async () => {
    const { gameId } = await createGame()
    const otherManager = (await addUser("other")).token
    const body = { answersOnly: true }

    const forbidden = await request(`/games/${gameId}/settings`, {
      method: "PATCH",
      token: otherManager,
      body,
    })

    expect(forbidden.status).toBe(StatusCodes.NOT_FOUND)

    const updated = await request(`/games/${gameId}/settings`, {
      method: "PATCH",
      token: managerToken,
      body,
    })

    expect(await json(updated)).toMatchObject({ settings: body })
  })

  it("checks an invite code", async () => {
    const { gameId, inviteCode } = await createGame()
    const check = () =>
      request("/games/check", { method: "POST", body: { inviteCode } })

    expect(await json(await check())).toEqual({
      generatedUsernames: false,
      subject: "Test quizz",
    })

    Registry.getInstance().getGameById(gameId)?.setLocked(true)

    expect((await check()).status).toBe(StatusCodes.FORBIDDEN)
    expect(
      (
        await request("/games/check", {
          method: "POST",
          body: { inviteCode: "000000" },
        })
      ).status,
    ).toBe(StatusCodes.NOT_FOUND)
  })

  it("gives a join ticket to players", async () => {
    const { gameId, inviteCode } = await createGame()
    const join = (token: string, username?: string) =>
      request("/games/join", {
        method: "POST",
        token,
        body: { inviteCode, username },
      })

    expect((await join(managerToken, "Boss")).status).toBe(
      StatusCodes.FORBIDDEN,
    )
    expect(await json(await join(playerToken))).toEqual({
      error: "errors:auth.usernameTooShort",
    })

    const { ticket } = await json<{ ticket: string }>(
      await join(playerToken, "Alice"),
    )

    await expect(verifyJoinTicket(ticket)).resolves.toMatchObject({
      sub: "player",
      gameId,
      username: "Alice",
    })
  })

  it("only lets managers create a game", async () => {
    const { id: quizzId } = saveQuizz(createQuizz([createQuestion()]))
    const create = (token?: string) =>
      request("/games", { method: "POST", token, body: { quizzId } })

    expect((await create()).status).toBe(StatusCodes.UNAUTHORIZED)
    expect((await create(playerToken)).status).toBe(StatusCodes.UNAUTHORIZED)
    expect(Registry.getInstance().getGameCount()).toBe(0)
  })

  it.each(["A", "Al", "Ali"])(
    "accepts the short username %s",
    async (username) => {
      const { inviteCode } = await createGame()
      const response = await request("/games/join", {
        method: "POST",
        token: playerToken,
        body: { inviteCode, username },
      })

      expect(await json(response)).toMatchObject({ username })
    },
  )
})

describe("results", () => {
  it("lists, reads and deletes a result", async () => {
    saveResult({
      id: "result",
      gameMode: QUIZZ_MODES.QUIZ,
      subject: "Subject",
      date: "2026-01-01T00:00:00.000Z",
      players: [{ username: "Alice", points: 1000, rank: 1 }],
      questions: [],
    })

    const list = await request("/results", { token: managerToken })

    expect(await json(list)).toMatchObject({
      results: [{ id: "result", playerCount: 1 }],
    })

    const result = await request("/results/result", { token: managerToken })

    expect(await json(result)).toMatchObject({ subject: "Subject" })

    const deleted = await request("/results/result", {
      method: "DELETE",
      token: managerToken,
    })

    expect(deleted.status).toBe(StatusCodes.NO_CONTENT)

    const missing = await request("/results/result", { token: managerToken })

    expect(missing.status).toBe(StatusCodes.NOT_FOUND)
    expect(await json(missing)).toEqual({ error: "errors:result.notFound" })
  })
})

describe("media", () => {
  it("uploads, lists and deletes a media", async () => {
    const uploaded = await upload(new File([PNG_BYTES], "picture.png"))

    expect(uploaded.status).toBe(StatusCodes.CREATED)

    const { name } = await json<{ name: string }>(uploaded)
    const list = await request("/media", { token: managerToken })

    expect(await json(list)).toMatchObject({ media: [{ name, type: "image" }] })

    const deleted = await request(`/media/${name}`, {
      method: "DELETE",
      token: managerToken,
    })

    expect(deleted.status).toBe(StatusCodes.NO_CONTENT)
  })

  it("rejects files that are not media", async () => {
    const response = await upload(new File(["text"], "notes.png"))

    expect(response.status).toBe(StatusCodes.UNSUPPORTED_MEDIA_TYPE)
    expect(await json(response)).toEqual({ error: "errors:media.invalidType" })
  })

  it.each([
    ["bad name.png", StatusCodes.BAD_REQUEST, "errors:media.invalidName"],
    ["missing.png", StatusCodes.NOT_FOUND, "errors:media.notFound"],
  ])("refuses to delete %s", async (name, status, error) => {
    const response = await request(`/media/${encodeURIComponent(name)}`, {
      method: "DELETE",
      token: managerToken,
    })

    expect(response.status).toBe(status)
    expect(await json(response)).toEqual({ error })
  })
})

describe("quizz permissions", () => {
  const owned = async (ownerId: string | null, access = {}) => {
    const { id } = saveQuizz(createQuizz([createQuestion()]), ownerId)

    if (Object.keys(access).length) {
      await request(`/quizz/${id}/access`, {
        method: "PATCH",
        token: managerToken,
        body: { visibility: "all", viewers: [], editors: [], ...access },
      })
    }

    return id
  }

  it("needs the create permission to create a quizz", async () => {
    const plain = await addUser("plain")
    const author = await addUser("author", { createQuizz: true })
    const body = createQuizz([createQuestion()])

    expect(
      (await request("/quizz", { method: "POST", token: plain.token, body }))
        .status,
    ).toBe(StatusCodes.FORBIDDEN)

    const created = await request("/quizz", {
      method: "POST",
      token: author.token,
      body,
    })

    expect(created.status).toBe(StatusCodes.CREATED)

    const { id } = await json<{ id: string }>(created)

    expect(
      (
        await json<{ access: { ownerId: string } }>(
          await request(`/quizz/${id}`, { token: author.token }),
        )
      ).access.ownerId,
    ).toBe(author.user.id)
  })

  it("hides secret quizzes from users who were not invited", async () => {
    const id = await owned(adminId, { visibility: "secret" })
    const outsider = await addUser("outsider")
    const { user, token } = await addUser("invited")

    await request(`/quizz/${id}/access`, {
      method: "PATCH",
      token: managerToken,
      body: { visibility: "secret", viewers: [user.id], editors: [] },
    })

    const ids = async (t: string) =>
      (
        await json<{ quizz: QuizzMeta[] }>(
          await request("/quizz", { token: t }),
        )
      ).quizz.map((q) => q.id)

    expect(await ids(outsider.token)).not.toContain(id)
    expect(await ids(token)).toContain(id)
    expect(
      (await request(`/quizz/${id}`, { token: outsider.token })).status,
    ).toBe(StatusCodes.NOT_FOUND)
    expect(
      (
        await request("/games", {
          method: "POST",
          token: outsider.token,
          body: { quizzId: id },
        })
      ).status,
    ).toBe(StatusCodes.NOT_FOUND)
    expect(
      (
        await request("/games", {
          method: "POST",
          token,
          body: { quizzId: id },
        })
      ).status,
    ).toBe(StatusCodes.CREATED)
  })

  it("only lets owners delete their own quizzes", async () => {
    const owner = await addUser("owner", {
      createQuizz: true,
      editQuizz: true,
      deleteQuizz: true,
    })
    const other = await addUser("other", { deleteQuizz: true })
    const mine = await owned(owner.user.id)
    const del = (id: string, token: string) =>
      request(`/quizz/${id}`, { method: "DELETE", token })

    expect((await del(mine, other.token)).status).toBe(StatusCodes.FORBIDDEN)
    expect((await del(mine, owner.token)).status).toBe(StatusCodes.NO_CONTENT)

    const adminOwned = await owned(adminId)

    expect((await del(adminOwned, owner.token)).status).toBe(
      StatusCodes.FORBIDDEN,
    )
    expect((await del(adminOwned, managerToken)).status).toBe(
      StatusCodes.NO_CONTENT,
    )
  })

  it("lets listed editors with the edit permission change a quizz", async () => {
    const editor = await addUser("editor", { editQuizz: true })
    const noRight = await addUser("noright")
    const id = await owned(adminId)
    const patch = (token: string) =>
      request(`/quizz/${id}`, {
        method: "PATCH",
        token,
        body: createQuizz([createQuestion()]),
      })

    expect((await patch(editor.token)).status).toBe(StatusCodes.FORBIDDEN)

    await request(`/quizz/${id}/access`, {
      method: "PATCH",
      token: managerToken,
      body: {
        visibility: "all",
        viewers: [],
        editors: [editor.user.id, noRight.user.id],
      },
    })

    expect((await patch(editor.token)).status).toBe(StatusCodes.OK)
    expect((await patch(noRight.token)).status).toBe(StatusCodes.FORBIDDEN)
  })

  it("only lets the owner or an admin change the access", async () => {
    const other = await addUser("other", { editQuizz: true })
    const id = await owned(adminId)

    const response = await request(`/quizz/${id}/access`, {
      method: "PATCH",
      token: other.token,
      body: { visibility: "secret", viewers: [], editors: [] },
    })

    expect(response.status).toBe(StatusCodes.FORBIDDEN)
  })

  it("only shows results to the host and admins", async () => {
    const host = await addUser("host")
    const other = await addUser("other")

    saveResult({
      id: "r1",
      gameMode: QUIZZ_MODES.QUIZ,
      subject: "Mine",
      date: "2026-01-01T00:00:00.000Z",
      players: [],
      questions: [],
      hostId: host.user.id,
    })

    const count = async (token: string) =>
      (await json<{ results: unknown[] }>(await request("/results", { token })))
        .results.length

    expect(await count(host.token)).toBe(1)
    expect(await count(other.token)).toBe(0)
    expect(await count(managerToken)).toBe(1)
    expect((await request("/results/r1", { token: other.token })).status).toBe(
      StatusCodes.NOT_FOUND,
    )
  })
})

describe("user management", () => {
  it("is admin only", async () => {
    const { token } = await addUser("plain")

    expect((await request("/users", { token })).status).toBe(
      StatusCodes.FORBIDDEN,
    )
    expect((await request("/users/directory", { token })).status).toBe(
      StatusCodes.OK,
    )
  })

  it("creates users that must change their password", async () => {
    const response = await request("/users", {
      method: "POST",
      token: managerToken,
      body: {
        username: "new.user",
        password: "first-password",
        role: "user",
        permissions: {
          createQuizz: true,
          editQuizz: false,
          deleteQuizz: false,
        },
      },
    })

    expect(response.status).toBe(StatusCodes.CREATED)
    expect(await json(response)).toMatchObject({
      username: "new.user",
      mustChangePassword: true,
    })
  })

  it("protects the last admin", async () => {
    const demote = await request(`/users/${adminId}`, {
      method: "PATCH",
      token: managerToken,
      body: { role: "user" },
    })

    expect(demote.status).toBe(StatusCodes.CONFLICT)

    const remove = await request(`/users/${adminId}`, {
      method: "DELETE",
      token: managerToken,
    })

    expect(remove.status).toBe(StatusCodes.CONFLICT)
  })

  it("hands quizzes of a deleted user to the deleting admin", async () => {
    const gone = await addUser("gone", { createQuizz: true })
    const { id } = saveQuizz(createQuizz([createQuestion()]), gone.user.id)

    const removed = await request(`/users/${gone.user.id}`, {
      method: "DELETE",
      token: managerToken,
    })

    expect(removed.status).toBe(StatusCodes.NO_CONTENT)

    const quizz = await json<{ access: { ownerId: string } }>(
      await request(`/quizz/${id}`, { token: managerToken }),
    )

    expect(quizz.access.ownerId).toBe(adminId)
    expect((await request("/quizz", { token: gone.token })).status).toBe(
      StatusCodes.UNAUTHORIZED,
    )
  })

  it("generates a temporary password on reset", async () => {
    const { user } = await addUser("forgetful")
    const response = await request(`/users/${user.id}/reset-password`, {
      method: "POST",
      token: managerToken,
      body: {},
    })
    const { password } = await json<{ password: string }>(response)

    expect(password.length).toBeGreaterThanOrEqual(8)

    const login = await request("/auth/login", {
      method: "POST",
      body: { username: "forgetful", password },
    })

    expect(login.status).toBe(StatusCodes.OK)
  })
})

describe("generator", () => {
  it("returns generated questions without saving a quizz", async () => {
    const author = await addUser("gen", { createQuizz: true })
    const response = await request("/generator", {
      method: "POST",
      token: author.token,
      body: { amount: 5, category: 9 },
    })

    expect(response.status).toBe(StatusCodes.OK)

    const { questions } = await json<{ questions: unknown[] }>(response)

    expect(questions).toHaveLength(1)
    expect(getQuizz().map((q) => q.subject)).toEqual(["Example Quizz"])
  })

  it("lists categories and rejects invalid input", async () => {
    const categories = await json<{ categories: Array<{ id: number }> }>(
      await request("/generator/categories", { token: managerToken }),
    )

    expect(categories.categories[0].id).toBe(9)

    const response = await request("/generator", {
      method: "POST",
      token: managerToken,
      body: { amount: 51 },
    })

    expect(response.status).toBe(StatusCodes.BAD_REQUEST)
  })

  it("is forbidden without quizz rights", async () => {
    const reader = await addUser("reader")

    for (const response of [
      await request("/generator", {
        method: "POST",
        token: reader.token,
        body: { amount: 5 },
      }),
      await request("/generator/categories", { token: reader.token }),
    ]) {
      expect(response.status).toBe(StatusCodes.FORBIDDEN)
    }
  })
})
