import {
  PIN_QUIZZ,
  PUZZLE_QUIZZ,
  SCORING_QUIZZ,
  SURVEY_QUIZZ,
} from "@razzia/e2e/utils/constants"
import { expect, test } from "@razzia/e2e/utils/fixtures"
import { t } from "@razzia/e2e/utils/i18n"
import { createGame, next, startGame } from "@razzia/e2e/utils/manager"
import {
  answer,
  confirm,
  expectPoints,
  joinGame,
} from "@razzia/e2e/utils/player"

test("scores every question type with its scoring settings", async ({
  page: manager,
  newPage,
}) => {
  const pin = await createGame(manager, SCORING_QUIZZ)
  const player = await newPage()

  await joinGame(player, pin, "Alice")
  await expect(manager.getByText("Alice")).toBeVisible()
  await startGame(manager)

  await answer(player, "Right")
  await expect(player.getByText("+500")).toBeVisible()
  await expectPoints(player, 500)
  await next(manager)

  await answer(player, "Red")
  await confirm(player)
  await expect(player.getByText("+500")).toBeVisible()
  await expectPoints(player, 1000)
  await next(manager)

  await answer(player, "Red")
  await confirm(player)
  await expect(player.getByText(t("game:wrong"))).toBeVisible()
  await expectPoints(player, 800)
  await next(manager)

  await player.getByLabel(t("game:estimation.yourAnswer")).fill("55")
  await confirm(player)
  await expect(player.getByText("+750")).toBeVisible()
  await expectPoints(player, 1550)
  await next(manager)

  await expect(
    player.getByText(t("game:rank", { count: 1, ordinal: true })),
  ).toBeVisible()
})

test("collects answers without scoring in survey mode", async ({
  page: manager,
  newPage,
}) => {
  const pin = await createGame(manager, SURVEY_QUIZZ)
  const alice = await newPage()
  const bob = await newPage()

  await joinGame(alice, pin, "Alice")
  await joinGame(bob, pin, "Bob")
  await expect(manager.getByText("Bob")).toBeVisible()
  await startGame(manager)

  await answer(alice, "Summer")
  await answer(bob, "Winter")

  await expect(alice.getByText(t("game:answerNoted"))).toBeVisible()
  await expect(bob.getByText(t("game:answerNoted"))).toBeVisible()

  await next(manager)

  await expect(manager.getByText(t("game:summary.title"))).toBeVisible()
  await expect(alice.getByText(t("game:summary.title"))).toBeVisible()
  await expect(alice.getByText(t("game:wrong"))).toBeHidden()
})

test("scores a puzzle per connection found, ignoring capitals and accents", async ({
  page: manager,
  newPage,
}) => {
  const pin = await createGame(manager, PUZZLE_QUIZZ)
  const player = await newPage()

  await joinGame(player, pin, "Alice")
  await expect(manager.getByText("Alice")).toBeVisible()
  await startGame(manager)

  await expect(player.getByText("Mars", { exact: true })).toBeVisible()
  await expect(player.getByText("Tempest", { exact: true })).toBeVisible()

  await player
    .getByLabel(t("game:puzzle.connection", { number: 1 }))
    .fill("  PLANÈTS ")
  await player
    .getByLabel(t("game:puzzle.connection", { number: 2 }))
    .fill("Rivers")
  await player
    .getByLabel(t("game:puzzle.connection", { number: 3 }))
    .fill("Shakespear plays")
  await confirm(player)

  await expect(player.getByText("+600")).toBeVisible()
  await expect(
    player.getByText(t("game:puzzle.found", { count: 2, total: 3 })),
  ).toBeVisible()
  await expect(player.getByText("Shakespeare plays")).toBeVisible()
})

test("scores a pin on its distance to the right spot and reveals every pin", async ({
  page: manager,
  newPage,
}) => {
  const pin = await createGame(manager, PIN_QUIZZ)
  const alice = await newPage()
  const bob = await newPage()

  await joinGame(alice, pin, "Alice")
  await joinGame(bob, pin, "Bob")
  await expect(manager.getByText("Bob")).toBeVisible()
  await startGame(manager)

  // Alice hits the middle, Bob taps a corner far beyond the maximum distance
  await alice.getByTestId("pin-field").click()
  await confirm(alice)
  await bob.getByTestId("pin-field").click({ position: { x: 2, y: 2 } })
  await confirm(bob)

  await expect(alice.getByText("+1000")).toBeVisible()
  await expect(bob.getByText(t("game:wrong"))).toBeVisible()

  await expect(
    manager.getByText(t("game:pin.pinsPlaced", { count: 2 })),
  ).toBeVisible()
  await expect(manager.getByText(t("game:pin.rightSpot"))).toBeVisible()
  await expect(manager.getByText("+1000")).toBeVisible()
})
