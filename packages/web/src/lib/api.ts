import { hc } from "hono/client"
import { StatusCodes } from "http-status-codes"
import type { ApiType } from "@razzia/socket/api"
import { clearToken, ensureSession } from "@razzia/web/lib/session"

export class ApiError extends Error {
  readonly status: StatusCodes
  readonly key: string

  constructor(status: StatusCodes, key: string) {
    super(key)
    this.status = status
    this.key = key
  }
}

/**
 * A stored session can be rejected without being expired, for example after a
 * deploy when the server restarted with a new signing secret. Drop it and try
 * once more with a fresh session before giving up.
 */
const authFetch = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
  retried = false,
): Promise<Response> =>
  ensureSession()
    .then(({ token }) => {
      const headers = new Headers(init?.headers)

      headers.set("Authorization", `Bearer ${token}`)

      return fetch(input, { ...init, headers })
    })
    .then((response) => {
      const status: StatusCodes = response.status

      if (status !== StatusCodes.UNAUTHORIZED) {
        return response
      }

      clearToken()

      if (retried) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "errors:auth.unauthorized")
      }

      return authFetch(input, init, true)
    })

export const api = hc<ApiType>("/api", {
  fetch: ((input, init) => authFetch(input, init)) as typeof fetch,
})

const readErrorKey = async (response: Response, fallback: string) => {
  try {
    const body = (await response.json()) as { error?: string }

    return body.error ?? fallback
  } catch {
    return fallback
  }
}

interface AnyClientResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

type ApiSuccess<R> = R extends { status: infer S; json: () => Promise<infer T> }
  ? S extends StatusCodes.OK | StatusCodes.CREATED
    ? T
    : never
  : never

export const unwrap = async <R extends AnyClientResponse>(
  request: Promise<R>,
  fallback = "errors:route.description",
): Promise<ApiSuccess<R>> => {
  const response = await request

  if (!response.ok) {
    throw new ApiError(
      response.status,
      await readErrorKey(response as unknown as Response, fallback),
    )
  }

  return (await response.json()) as ApiSuccess<R>
}

export const unwrapEmpty = async (
  request: Promise<AnyClientResponse>,
  fallback = "errors:route.description",
): Promise<void> => {
  const response = await request

  if (!response.ok) {
    throw new ApiError(
      response.status,
      await readErrorKey(response as unknown as Response, fallback),
    )
  }
}
