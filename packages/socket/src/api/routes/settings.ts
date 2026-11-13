import { zValidator } from "@hono/zod-validator"
import { appSettingsValidator } from "@razzia/common/validators/quizz"
import { apiFactory } from "@razzia/socket/api/factory"
import { requireAdmin, requireManager } from "@razzia/socket/api/middleware"
import { i18nHook } from "@razzia/socket/api/validation"
import { getSettings, saveSettings } from "@razzia/socket/services/settings"

const routes = apiFactory
  .createApp()
  // Public: players need the default background too.
  .get("/", (c) => c.json(getSettings()))
  .use(requireManager)
  .use(requireAdmin)
  .put("/", zValidator("json", appSettingsValidator, i18nHook), (c) =>
    c.json(saveSettings(c.req.valid("json"))),
  )

export const settings = routes
