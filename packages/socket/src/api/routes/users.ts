import { zValidator } from "@hono/zod-validator"
import { StatusCodes } from "http-status-codes"
import {
  createUserValidator,
  resetPasswordValidator,
  updateUserValidator,
} from "@razzia/common/validators/auth"
import { apiFactory } from "@razzia/socket/api/factory"
import { requireAdmin, requireManager } from "@razzia/socket/api/middleware"
import { i18nHook } from "@razzia/socket/api/validation"
import { reassignUserQuizzes } from "@razzia/socket/services/config"
import { conflict } from "@razzia/socket/services/errors"
import {
  createUser,
  deleteUser,
  generateTemporaryPassword,
  listUsers,
  setPassword,
  updateUser,
} from "@razzia/socket/services/users"

const routes = apiFactory
  .createApp()
  .use(requireManager)
  // Names only, so any user can pick who to share a quizz with.
  .get("/directory", (c) =>
    c.json({
      users: listUsers().map(({ id, username }) => ({ id, username })),
    }),
  )
  .use(requireAdmin)
  .get("/", (c) => c.json({ users: listUsers() }))
  .post("/", zValidator("json", createUserValidator, i18nHook), async (c) =>
    c.json(
      await createUser({
        ...c.req.valid("json"),
        mustChangePassword: true,
      }),
      StatusCodes.CREATED,
    ),
  )
  .patch("/:id", zValidator("json", updateUserValidator, i18nHook), (c) =>
    c.json(updateUser(c.req.param("id"), c.req.valid("json"))),
  )
  .post(
    "/:id/reset-password",
    zValidator("json", resetPasswordValidator, i18nHook),
    async (c) => {
      const password =
        c.req.valid("json").password ?? generateTemporaryPassword()

      await setPassword(c.req.param("id"), password, true)

      return c.json({ password })
    },
  )
  .delete("/:id", (c) => {
    const id = c.req.param("id")
    const self = c.get("user")

    if (id === self.id) {
      throw conflict("errors:users.cannotDeleteSelf")
    }

    deleteUser(id)
    reassignUserQuizzes(id, self.id)

    return c.body(null, StatusCodes.NO_CONTENT)
  })

export const users = routes
