import { zValidator } from "@hono/zod-validator"
import { StatusCodes } from "http-status-codes"
import { createApiTokenValidator } from "@razzia/common/validators/auth"
import { apiFactory } from "@razzia/socket/api/factory"
import { requireManager } from "@razzia/socket/api/middleware"
import { i18nHook } from "@razzia/socket/api/validation"
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
} from "@razzia/socket/services/api-tokens"

/** Manages your own API tokens. Needs a real session, never a token. */
export const tokens = apiFactory
  .createApp()
  .use(requireManager)
  .get("/", (c) => c.json({ tokens: listApiTokens(c.get("user").id) }))
  .post("/", zValidator("json", createApiTokenValidator, i18nHook), (c) =>
    c.json(
      createApiToken(c.get("user").id, c.req.valid("json")),
      StatusCodes.CREATED,
    ),
  )
  .delete("/:id", (c) => {
    revokeApiToken(c.get("user").id, c.req.param("id"))

    return c.body(null, StatusCodes.NO_CONTENT)
  })
