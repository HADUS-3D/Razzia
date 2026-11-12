import { zValidator } from "@hono/zod-validator"
import { StatusCodes } from "http-status-codes"
import { canCreateQuizz } from "@razzia/common/permissions"
import { generatorValidator } from "@razzia/common/validators/generator"
import { apiFactory } from "@razzia/socket/api/factory"
import { requireManager } from "@razzia/socket/api/middleware"
import { i18nHook } from "@razzia/socket/api/validation"
import { saveQuizz } from "@razzia/socket/services/config"
import { forbidden } from "@razzia/socket/services/errors"
import { openTdb } from "@razzia/socket/services/opentdb"

export const generator = apiFactory
  .createApp()
  .use(requireManager)
  .get("/categories", async (c) => {
    if (!canCreateQuizz(c.get("user"))) {
      throw forbidden("errors:auth.forbidden")
    }

    return c.json({ categories: await openTdb.getCategories() })
  })
  .post("/", zValidator("json", generatorValidator, i18nHook), async (c) => {
    const user = c.get("user")

    if (!canCreateQuizz(user)) {
      throw forbidden("errors:auth.forbidden")
    }

    const quizz = await openTdb.generate(user.id, c.req.valid("json"))
    const { id } = saveQuizz(quizz, user.id)

    return c.json(
      { id, subject: quizz.subject, questionCount: quizz.questions.length },
      StatusCodes.CREATED,
    )
  })
