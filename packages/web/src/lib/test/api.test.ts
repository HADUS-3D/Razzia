import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SESSION_ROLES } from "@razzia/common/constants"

const now = () => Math.floor(Date.now() / 1000)

const createToken = (sub: string) =>
  `header.${Buffer.from(
    JSON.stringify({ sub, role: SESSION_ROLES.PLAYER, exp: now() + 3600 }),
  ).toString("base64url")}.signature`

const storage = new Map<string, string>()
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.resetModules()
  storage.clear()
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("api session handling", () => {
  it("retries once with a new session when the stored one is rejected", async () => {
    const fresh = createToken("fresh")
    const { setToken } = await import("@razzia/web/lib/session")

    setToken(createToken("stale"))

    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({
          token: fresh,
          clientId: "fresh",
          role: SESSION_ROLES.PLAYER,
          expiresAt: now() + 3600,
        }),
      )
      .mockResolvedValueOnce(Response.json({ ok: true }))

    const { api } = await import("@razzia/web/lib/api")
    const response = await api.games.join.$post({
      json: { inviteCode: "123456" },
    })

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(
      new Headers(fetchMock.mock.calls[2][1]?.headers).get("Authorization"),
    ).toBe(`Bearer ${fresh}`)
  })

  it("gives up with unauthorized when the new session is rejected too", async () => {
    const { setToken } = await import("@razzia/web/lib/session")

    setToken(createToken("stale"))

    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        Response.json({
          token: createToken("fresh"),
          clientId: "fresh",
          role: SESSION_ROLES.PLAYER,
          expiresAt: now() + 3600,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))

    const { api } = await import("@razzia/web/lib/api")

    await expect(
      api.games.join.$post({ json: { inviteCode: "123456" } }),
    ).rejects.toMatchObject({ key: "errors:auth.unauthorized" })
  })
})
