import { zValidator } from "@hono/zod-validator"
import { createHash, timingSafeEqual } from "crypto"
import { Hono, type Context } from "hono"
import { JwtTokenExpired } from "hono/utils/jwt/types"
import { StatusCodes } from "http-status-codes"
import type {
  AuthStatus,
  PublicUser,
  SessionResponse,
} from "@razzia/common/types/auth"
import type { ApiEnv } from "@razzia/socket/api/factory"
import { SESSION_ROLES } from "@razzia/common/constants"
import {
  changePasswordValidator,
  loginValidator,
  sessionRequestValidator,
  setupValidator,
} from "@razzia/common/validators/auth"
import { readClaims, requireUser } from "@razzia/socket/api/middleware"
import { i18nHook } from "@razzia/socket/api/validation"
import { managerPassword } from "@razzia/socket/env"
import {
  mintToken,
  newClientId,
  verifyIgnoringExpiry,
  verifyToken,
} from "@razzia/socket/services/auth"
import { assignOrphanQuizzes } from "@razzia/socket/services/config"
import {
  isLimited,
  recordFailure,
  resetFailures,
} from "@razzia/socket/services/rate-limit"
import {
  authenticate,
  changeOwnPassword,
  createFirstAdmin,
  hasUsers,
} from "@razzia/socket/services/users"

const readRequestToken = async (c: Context): Promise<string | undefined> => {
  try {
    const result = sessionRequestValidator.safeParse(await c.req.json())

    if (result.success && result.data.token) {
      return result.data.token
    }
  } catch {
    /* Empty */
  }

  const header = c.req.header("Authorization")

  return header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : undefined
}

const freshPlayerSession = (): Promise<SessionResponse> =>
  mintToken(newClientId(), SESSION_ROLES.PLAYER)

const SETUP_KEY = "setup"

const safeEqual = (a: string, b: string): boolean => {
  const digest = (value: string) => createHash("sha256").update(value).digest()

  return timingSafeEqual(digest(a), digest(b))
}

const loginSession = async (c: Context, user: PublicUser) => {
  const claims = await readClaims(c)

  return mintToken(claims?.sub ?? newClientId(), SESSION_ROLES.MANAGER, user.id)
}

const routes = new Hono<ApiEnv>()
  .post("/session", async (c) => {
    const token = await readRequestToken(c)

    if (!token) {
      return c.json(await freshPlayerSession())
    }

    try {
      const claims = await verifyToken(token)

      return c.json({
        token,
        clientId: claims.sub,
        role: claims.role,
        expiresAt: claims.exp,
      } satisfies SessionResponse)
    } catch (error) {
      if (error instanceof JwtTokenExpired) {
        try {
          const claims = await verifyIgnoringExpiry(token)

          return c.json(await mintToken(claims.sub, SESSION_ROLES.PLAYER))
        } catch {
          /* Empty */
        }
      }

      return c.json(await freshPlayerSession())
    }
  })
  .get("/status", (c) =>
    c.json({ needsSetup: !hasUsers() } satisfies AuthStatus),
  )
  .post("/setup", zValidator("json", setupValidator, i18nHook), async (c) => {
    const { username, password, setupCode } = c.req.valid("json")

    if (hasUsers()) {
      return c.json({ error: "errors:auth.setupDone" }, StatusCodes.CONFLICT)
    }

    if (!managerPassword) {
      return c.json(
        { error: "errors:manager.passwordNotConfigured" },
        StatusCodes.FORBIDDEN,
      )
    }

    if (isLimited(SETUP_KEY)) {
      return c.json(
        { error: "errors:auth.tooManyAttempts" },
        StatusCodes.TOO_MANY_REQUESTS,
      )
    }

    if (!safeEqual(setupCode, managerPassword)) {
      recordFailure(SETUP_KEY)

      return c.json(
        { error: "errors:manager.invalidPassword" },
        StatusCodes.FORBIDDEN,
      )
    }

    resetFailures(SETUP_KEY)

    const user = await createFirstAdmin(username, password)

    assignOrphanQuizzes(user.id)

    return c.json(await loginSession(c, user), StatusCodes.CREATED)
  })
  .post("/login", zValidator("json", loginValidator, i18nHook), async (c) => {
    const { username, password } = c.req.valid("json")
    const key = `login:${username.toLowerCase()}`

    if (isLimited(key)) {
      return c.json(
        { error: "errors:auth.tooManyAttempts" },
        StatusCodes.TOO_MANY_REQUESTS,
      )
    }

    const user = await authenticate(username, password)

    if (!user) {
      recordFailure(key)

      return c.json(
        { error: "errors:auth.invalidCredentials" },
        StatusCodes.FORBIDDEN,
      )
    }

    resetFailures(key)

    return c.json(await loginSession(c, user))
  })
  .get("/me", requireUser, (c) => c.json(c.get("user")))
  .patch(
    "/password",
    requireUser,
    zValidator("json", changePasswordValidator, i18nHook),
    async (c) => {
      const { currentPassword, newPassword } = c.req.valid("json")
      const user = c.get("user")
      const key = `password:${user.id}`

      if (isLimited(key)) {
        return c.json(
          { error: "errors:auth.tooManyAttempts" },
          StatusCodes.TOO_MANY_REQUESTS,
        )
      }

      try {
        return c.json(
          await changeOwnPassword(user.id, currentPassword, newPassword),
        )
      } catch (error) {
        recordFailure(key)

        throw error
      }
    },
  )
  .post("/logout", async (c) => {
    const claims = await readClaims(c)

    if (!claims) {
      return c.json(
        { error: "errors:auth.unauthorized" },
        StatusCodes.UNAUTHORIZED,
      )
    }

    return c.json(await mintToken(claims.sub, SESSION_ROLES.PLAYER))
  })

export const auth = routes
