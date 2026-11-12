import { defineConfig, devices } from "@playwright/test"
import { randomBytes, scryptSync } from "crypto"
import fs from "fs"
import { join } from "path"
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  CONFIG_PATH,
  MANAGER_PASSWORD,
} from "@razzia/e2e/utils/constants"

const root = join(import.meta.dirname, "../..")

if (!process.env.TEST_WORKER_INDEX) {
  fs.rmSync(CONFIG_PATH, { recursive: true, force: true })
  fs.mkdirSync(join(CONFIG_PATH, "quizz"), { recursive: true })
  fs.cpSync(
    join(import.meta.dirname, "fixtures/quizz"),
    join(CONFIG_PATH, "quizz"),
    { recursive: true },
  )

  // Same scrypt format as the server, so the tests start with an admin account.
  const salt = randomBytes(16)
  const hash = scryptSync(ADMIN_PASSWORD, salt, 64)

  fs.writeFileSync(
    join(CONFIG_PATH, "users.json"),
    JSON.stringify([
      {
        id: "e2e-admin-id",
        username: ADMIN_USERNAME,
        role: "admin",
        permissions: { createQuizz: true, editQuizz: true, deleteQuizz: true },
        mustChangePassword: false,
        passwordHash: `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`,
        createdAt: new Date().toISOString(),
      },
    ]),
  )
}

export default defineConfig({
  testDir: "tests",
  outputDir: "test-results",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: 3,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node --import tsx src/index.ts",
      cwd: join(root, "packages/socket"),
      url: "http://localhost:3001/api/health",
      reuseExistingServer: false,
      env: {
        CONFIG_PATH,
        MANAGER_PASSWORD,
        JWT_SECRET: "e2e-secret-that-is-at-least-32-characters",
        GAME_SPEED: "10",
      },
    },
    {
      command:
        "node node_modules/vite/bin/vite.js build && node node_modules/vite/bin/vite.js preview --strictPort",
      cwd: join(root, "packages/web"),
      url: "http://localhost:3000",
      reuseExistingServer: false,
    },
  ],
})
