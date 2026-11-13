import fs from "fs"
import type { AppSettings } from "@razzia/common/types/game"
import { appSettingsValidator } from "@razzia/common/validators/quizz"
import { getPath } from "@razzia/socket/services/config"

const getSettingsFile = () => getPath("settings.json")

export const getSettings = (): AppSettings => {
  try {
    const result = appSettingsValidator.safeParse(
      JSON.parse(fs.readFileSync(getSettingsFile(), "utf-8")),
    )

    return result.success ? result.data : {}
  } catch {
    return {}
  }
}

export const saveSettings = (settings: AppSettings): AppSettings => {
  const dir = getPath()

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(getSettingsFile(), JSON.stringify(settings, null, 2))

  return settings
}
