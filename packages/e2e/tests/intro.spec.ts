import type { Question } from "@razzia/common/types/game"
import { seedQuizz } from "@razzia/e2e/utils/editor"
import { expect, test } from "@razzia/e2e/utils/fixtures"
import { t } from "@razzia/e2e/utils/i18n"
import { createGame, startGame } from "@razzia/e2e/utils/manager"
import { joinGame } from "@razzia/e2e/utils/player"

const question = (overrides: Partial<Question>): Question => ({
  type: "single",
  question: "Question?",
  answers: ["Right", "Wrong"],
  solutions: [0],
  cooldown: 3,
  time: 30,
  ...overrides,
})

const estimation = (closestWins: boolean): Question =>
  question({
    type: "estimation",
    answers: [],
    solutions: [5],
    options: {
      inputMode: "slider",
      min: 0,
      max: 10,
      step: 1,
      margin: closestWins ? 0 : 2,
      closestWins,
    },
  })

test("explains the quiz on the intro slide, confirm button in reach on a phone", async ({
  page: manager,
  newPage,
}) => {
  const subject = `Intro game ${Date.now()}`

  seedQuizz(subject, {
    intro: true,
    questions: [
      question({ question: "One" }),
      question({ question: "Two", type: "multi", solutions: [0, 1] }),
      estimation(true),
      question({ question: "Top", topPercent: 50, penalty: 100 }),
    ],
  })

  const pin = await createGame(manager, subject)
  const player = await newPage({
    viewport: { width: 375, height: 560 },
    hasTouch: true,
    isMobile: true,
  })

  await joinGame(player, pin, "Alice")
  await startGame(manager)

  // Only "closest wins" in the quiz: only that explanation
  await expect(manager.getByText(t("game:intro.title"))).toBeVisible()
  await expect(
    manager.getByText(t("game:intro.estimation.text_closest")),
  ).toBeVisible()
  await expect(
    manager.getByText(t("game:intro.estimation.text_margin")),
  ).toBeHidden()
  await expect(
    manager.getByText(/top 50% of the players \(1 of 1\)/u),
  ).toBeVisible()

  // The confirm button stays in view on a small screen, without scrolling
  const read = player.getByRole("button", { name: t("game:intro.read") })

  await expect(async () => {
    const box = await read.boundingBox()

    expect((box?.y ?? 9999) + (box?.height ?? 0)).toBeLessThanOrEqual(560)
  }).toPass()
  await read.click()
  await expect(
    manager.getByText(t("game:intro.pending", { count: 0 })),
  ).toBeVisible()
})
