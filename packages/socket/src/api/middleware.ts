import type { Context } from "hono"
import { createMiddleware } from "hono/factory"
import { StatusCodes } from "http-status-codes"
import type { SessionClaims } from "@razzia/common/types/auth"
import { SESSION_ROLES } from "@razzia/common/constants"
import { isAdmin } from "@razzia/common/permissions"
import { type ApiEnv } from "@razzia/socket/api/factory"
import {
  authenticateApiToken,
  looksLikeApiToken,
} from "@razzia/socket/services/api-tokens"
import { verifyToken } from "@razzia/socket/services/auth"
import { getUserById } from "@razzia/socket/services/users"

const UNAUTHORIZED = { error: "errors:auth.unauthorized" } as const

const getBearerToken = (c: Context): string | undefined => {
  const header = c.req.header("Authorization")

  if (!header?.startsWith("Bearer ")) {
    return undefined
  }

  return header.slice("Bearer ".length)
}

export const readClaims = async (
  c: Context,
): Promise<SessionClaims | undefined> => {
  const token = getBearerToken(c)

  if (!token) {
    return undefined
  }

  try {
    return await verifyToken(token)
  } catch {
    return undefined
  }
}

export const requireSession = createMiddleware<ApiEnv>(async (c, next) => {
  const claims = await readClaims(c)

  if (!claims) {
    return c.json(UNAUTHORIZED, StatusCodes.UNAUTHORIZED)
  }

  c.set("claims", claims)

  await next()
})

const loadUser = async (c: Context) => {
  const claims = await readClaims(c)

  if (!claims || claims.role !== SESSION_ROLES.MANAGER || !claims.userId) {
    return null
  }

  // Always read fresh, so revoked rights and deleted users apply at once.
  const user = getUserById(claims.userId)

  return user ? { claims, user } : null
}

/** A signed-in user. Blocks everything until a reset password is replaced. */
export const requireManager = createMiddleware<ApiEnv>(async (c, next) => {
  const session = await loadUser(c)

  if (!session) {
    return c.json(UNAUTHORIZED, StatusCodes.UNAUTHORIZED)
  }

  if (session.user.mustChangePassword) {
    return c.json(
      { error: "errors:auth.passwordChangeRequired" },
      StatusCodes.FORBIDDEN,
    )
  }

  c.set("claims", session.claims)
  c.set("user", session.user)

  await next()
})

/** A signed-in user, even if they still have to change their password. */
export const requireUser = createMiddleware<ApiEnv>(async (c, next) => {
  const session = await loadUser(c)

  if (!session) {
    return c.json(UNAUTHORIZED, StatusCodes.UNAUTHORIZED)
  }

  c.set("claims", session.claims)
  c.set("user", session.user)

  await next()
})

export const requireAdmin = createMiddleware<ApiEnv>(async (c, next) => {
  if (!isAdmin(c.get("user"))) {
    return c.json({ error: "errors:auth.forbidden" }, StatusCodes.FORBIDDEN)
  }

  await next()
})

/**
 * A signed-in user, either through a manager session or an API token. Only the
 * quizz routes use this, so a token can never reach accounts or settings.
 */
export const requireManagerOrApiToken = createMiddleware<ApiEnv>(
  async (c, next) => {
    const bearer = getBearerToken(c)

    if (!bearer || !looksLikeApiToken(bearer)) {
      return requireManager(c, next)
    }

    const user = authenticateApiToken(bearer)

    if (!user) {
      return c.json(UNAUTHORIZED, StatusCodes.UNAUTHORIZED)
    }

    if (user.mustChangePassword) {
      return c.json(
        { error: "errors:auth.passwordChangeRequired" },
        StatusCodes.FORBIDDEN,
      )
    }

    c.set("user", user)

    await next()
  },
)
