import { answerInput, readQuizz, saveQuizz } from "@razzia/e2e/utils/editor"
import { expect, test } from "@razzia/e2e/utils/fixtures"
import { t } from "@razzia/e2e/utils/i18n"
import { loginManager } from "@razzia/e2e/utils/manager"
import { pngFile } from "@razzia/e2e/utils/media"

test("an admin sets the default background of the app", async ({ page }) => {
  const tag = `bg${Date.now()}`

  await loginManager(page)
  await page.getByTitle(t("manager:background.title")).click()

  const dialog = page.getByRole("dialog", {
    name: t("manager:background.title"),
  })

  await dialog.locator("input[type=file]").setInputFiles(pngFile(tag))
  await expect(page.getByText(t("manager:background.saved"))).toBeVisible()
  await expect(
    dialog.getByAltText(t("quizz:background.preview")),
  ).toHaveAttribute("src", new RegExp(`^/media/${tag}-`, "u"))

  const response = await page.request.get("/api/settings")

  const settings = (await response.json()) as { background?: string }

  expect(settings.background).toMatch(new RegExp(`^/media/${tag}-`, "u"))

  await dialog
    .getByRole("button", { name: t("quizz:background.remove") })
    .click()
  await expect(dialog.getByText(t("manager:background.stock"))).toBeVisible()
})

test("a question gets its own background", async ({ page }) => {
  const subject = `Background quizz ${Date.now()}`
  const tag = `qbg${Date.now()}`

  await loginManager(page)
  await page
    .getByRole("button", { name: t("manager:tabs.quizz"), exact: true })
    .click()
  await page.getByRole("button", { name: t("manager:quizz.create") }).click()
  await page.getByPlaceholder(t("quizz:titleQuizzPlaceholder")).fill(subject)
  await page.getByPlaceholder(t("quizz:question.placeholder")).fill("Where?")
  await answerInput(page, 0).fill("Here")
  await answerInput(page, 1).fill("There")

  await page
    .locator("aside input[type=file]")
    .first()
    .setInputFiles(pngFile(tag))
  await expect(
    page.locator("aside").getByAltText(t("quizz:background.preview")),
  ).toHaveAttribute("src", new RegExp(`^/media/${tag}-`, "u"))

  await saveQuizz(page)

  expect(readQuizz(subject)?.questions[0].background).toMatch(
    new RegExp(`^/media/${tag}-`, "u"),
  )
})
