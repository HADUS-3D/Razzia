import { zValidator } from "@hono/zod-validator"
import { StatusCodes } from "http-status-codes"
import type { QuizzMeta } from "@razzia/common/types/game"
import {
  canCreateQuizz,
  canDeleteQuizz,
  canEditQuizz,
  canManageAccess,
  canViewQuizz,
} from "@razzia/common/permissions"
import { quizzAccessValidator } from "@razzia/common/validators/auth"
import { quizzValidator } from "@razzia/common/validators/quizz"
import { apiFactory } from "@razzia/socket/api/factory"
import { requireManager } from "@razzia/socket/api/middleware"
import { i18nHook } from "@razzia/socket/api/validation"
import {
  deleteQuizz,
  getQuizzEntries,
  getQuizzEntryById,
  saveQuizz,
  updateQuizz,
  updateQuizzAccess,
  type QuizzEntry,
} from "@razzia/socket/services/config"
import {
  forbidden,
  invalidInput,
  notFound,
} from "@razzia/socket/services/errors"
import { getUserById } from "@razzia/socket/services/users"

const subjectCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

// A quizz the user may not see is reported as missing, not forbidden.
const visibleEntry = (user: Parameters<typeof canViewQuizz>[0], id: string) => {
  const entry = getQuizzEntryById(id)

  if (!canViewQuizz(user, entry.access)) {
    throw notFound("errors:quizz.notFound")
  }

  return entry
}

const toMeta = (
  user: Parameters<typeof canViewQuizz>[0],
  { id, subject, access }: QuizzEntry,
): QuizzMeta => ({
  id,
  subject,
  ownerId: access.ownerId,
  visibility: access.visibility,
  canEdit: canEditQuizz(user, access),
  canDelete: canDeleteQuizz(user, access),
})

const routes = apiFactory
  .createApp()
  .use(requireManager)
  .get("/", (c) => {
    const user = c.get("user")

    return c.json({
      quizz: getQuizzEntries()
        .filter((entry) => canViewQuizz(user, entry.access))
        .map((entry) => toMeta(user, entry))
        .sort((a, b) => subjectCollator.compare(a.subject, b.subject)),
    })
  })
  .get("/:id", (c) => {
    const user = c.get("user")
    const entry = visibleEntry(user, c.req.param("id"))

    return c.json({
      ...entry,
      canEdit: canEditQuizz(user, entry.access),
      canDelete: canDeleteQuizz(user, entry.access),
      canManageAccess: canManageAccess(user, entry.access),
    })
  })
  .post("/", zValidator("json", quizzValidator, i18nHook), (c) => {
    const user = c.get("user")

    if (!canCreateQuizz(user)) {
      throw forbidden("errors:auth.forbidden")
    }

    return c.json(saveQuizz(c.req.valid("json"), user.id), StatusCodes.CREATED)
  })
  .patch("/:id", zValidator("json", quizzValidator, i18nHook), (c) => {
    const user = c.get("user")
    const entry = visibleEntry(user, c.req.param("id"))

    if (!canEditQuizz(user, entry.access)) {
      throw forbidden("errors:auth.forbidden")
    }

    return c.json(updateQuizz(entry.id, c.req.valid("json")))
  })
  .patch(
    "/:id/access",
    zValidator("json", quizzAccessValidator, i18nHook),
    (c) => {
      const user = c.get("user")
      const entry = visibleEntry(user, c.req.param("id"))

      if (!canManageAccess(user, entry.access)) {
        throw forbidden("errors:auth.forbidden")
      }

      const input = c.req.valid("json")
      const ownerId = input.ownerId ?? entry.access.ownerId
      const known = [...input.viewers, ...input.editors, ownerId ?? ""]

      if (
        known.some((id) => id !== "" && !getUserById(id)) ||
        (input.ownerId !== undefined && !getUserById(input.ownerId))
      ) {
        throw invalidInput("errors:users.notFound")
      }

      updateQuizzAccess(entry.id, {
        ownerId,
        visibility: input.visibility,
        viewers: [...new Set(input.viewers)],
        editors: [...new Set(input.editors)],
      })

      return c.json({ id: entry.id })
    },
  )
  .delete("/:id", (c) => {
    const user = c.get("user")
    const entry = visibleEntry(user, c.req.param("id"))

    if (!canDeleteQuizz(user, entry.access)) {
      throw forbidden("errors:auth.forbidden")
    }

    deleteQuizz(entry.id)

    return c.body(null, StatusCodes.NO_CONTENT)
  })

export const quizz = routes
