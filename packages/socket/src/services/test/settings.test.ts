import fs from "fs"
import { beforeEach, describe, expect, it } from "vitest"
import { getPath } from "@razzia/socket/services/config"
import { getSettings, saveSettings } from "@razzia/socket/services/settings"

beforeEach(() => {
  fs.rmSync(getPath("settings.json"), { force: true })
})

describe("settings", () => {
  it("is empty until something is saved", () => {
    expect(getSettings()).toEqual({})
  })

  it("stores and clears the default background", () => {
    saveSettings({ background: "/media/party.png" })

    expect(getSettings()).toEqual({ background: "/media/party.png" })

    saveSettings({})

    expect(getSettings()).toEqual({})
  })

  it("ignores a corrupt settings file", () => {
    fs.mkdirSync(getPath(), { recursive: true })
    fs.writeFileSync(getPath("settings.json"), "{nope")

    expect(getSettings()).toEqual({})
  })
})
