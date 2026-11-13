import type { Question } from "@razzia/common/types/game"
import {
  answerInput,
  openQuizzTab,
  readQuizz,
  saveQuizz,
  seedQuizz,
  toggleSolution,
} from "@razzia/e2e/utils/editor"
import { expect, test } from "@razzia/e2e/utils/fixtures"
import { t } from "@razzia/e2e/utils/i18n"
import { createGame, next, startGame } from "@razzia/e2e/utils/manager"
import { answer, joinGame } from "@razzia/e2e/utils/player"

const question = (overrides: Partial<Question>): Question => ({
  type: "single",
  question: "Question?",
  answers: ["Right", "Wrong"],
  solutions: [0],
  cooldown: 3,
  time: 30,
  ...overrides,
})

test("plays a quiz in rounds", async ({ page: manager, newPage }) => {
  const subject = `Rounds game ${Date.now()}`

  seedQuizz(subject, {
    questions: [
      question({ question: "First", round: { name: "Warm-up" } }),
      question({ question: "Second" }),
      question({ question: "Third", round: { name: "Finale" } }),
    ],
  })

  const pin = await createGame(manager, subject)
  const player = await newPage()

  // The quizz name is on the lobby and on the screen where players sign in
  await expect(manager.getByText(subject)).toBeVisible()
  await player.goto(`/?pin=${pin}`)
  await expect(player.getByText(subject)).toBeVisible()

  await joinGame(player, pin, "Alice")
  await expect(manager.getByText("Alice")).toBeVisible()
  await startGame(manager)

  // No title slide with the quizz name; the round opens with its own name
  await expect(manager.getByText("Warm-up")).toBeVisible()
  await expect(manager.getByText(subject)).toBeHidden()

  await answer(player, "Right")
  await next(manager)
  await expect(manager.getByText(t("game:leaderboard"))).toBeVisible()
  await next(manager)

  await answer(player, "Right")
  await next(manager)

  await expect(
    manager.getByText(t("game:round.over", { name: "Warm-up" })),
  ).toBeVisible()
  await expect(
    manager.getByRole("img", {
      name: `${t("game:round.bestStreak")}: ${t("game:round.bestStreakCount", { count: 2 })}`,
    }),
  ).toBeVisible()
  await next(manager)

  await expect(manager.getByText("Finale")).toBeVisible()
  await expect(
    manager.getByText(t("game:round.title", { number: 2 }), { exact: false }),
  ).toBeVisible()
})

test("sets a round in the editor", async ({ page }) => {
  const subject = `Round editor ${Date.now()}`

  await openQuizzTab(page)
  await page.getByRole("button", { name: t("manager:quizz.create") }).click()
  await page.getByPlaceholder(t("quizz:titleQuizzPlaceholder")).fill(subject)
  await page
    .getByPlaceholder(t("quizz:question.placeholder"))
    .fill("First question")
  await answerInput(page, 0).fill("Right")
  await answerInput(page, 1).fill("Wrong")
  await toggleSolution(page, 0)
  await page
    .getByRole("textbox", { name: t("quizz:round.label"), exact: true })
    .fill("Warm-up")

  await expect(page.getByText(t("quizz:round.background"))).toBeVisible()

  await saveQuizz(page)

  expect(readQuizz(subject)?.questions[0].round).toEqual({ name: "Warm-up" })
})
