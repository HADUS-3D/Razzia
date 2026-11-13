import { Hono } from "hono"
import { auth } from "@razzia/socket/api/routes/auth"
import { games } from "@razzia/socket/api/routes/games"
import { generator } from "@razzia/socket/api/routes/generator"
import { media } from "@razzia/socket/api/routes/media"
import { quizz } from "@razzia/socket/api/routes/quizz"
import { results } from "@razzia/socket/api/routes/results"
import { settings } from "@razzia/socket/api/routes/settings"
import { users } from "@razzia/socket/api/routes/users"

const routes = new Hono()
  .get("/health", (c) => c.json({ status: "ok" }))
  .route("/auth", auth)
  .route("/quizz", quizz)
  .route("/generator", generator)
  .route("/results", results)
  .route("/users", users)
  .route("/games", games)
  .route("/media", media)
  .route("/settings", settings)

export const api = routes

export type ApiType = typeof routes
