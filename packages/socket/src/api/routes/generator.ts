import { zValidator } from "@hono/zod-validator"
import { canCreateQuizz } from "@razzia/common/permissions"
import { generatorValidator } from "@razzia/common/validators/generator"
import { apiFactory } from "@razzia/socket/api/factory"
import { requireManagerOrApiToken } from "@razzia/socket/api/middleware"
import { i18nHook } from "@razzia/socket/api/validation"
import { forbidden } from "@razzia/socket/services/errors"
import { openTdb } from "@razzia/socket/services/opentdb"

/** Fetches questions for the quizz editor; nothing is saved here. */
export const generator = apiFactory
  .createApp()
  .use(requireManagerOrApiToken)
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

    return c.json({
      questions: await openTdb.generate(user.id, c.req.valid("json")),
    })
  })
