import { expect, test } from "@razzia/e2e/utils/fixtures"
import { t } from "@razzia/e2e/utils/i18n"
import { loginManager } from "@razzia/e2e/utils/manager"

test("an admin adds a user who must pick a new password", async ({ page }) => {
  const username = `user-${Date.now()}`

  await loginManager(page)
  await page.getByRole("button", { name: t("manager:users.title") }).click()
  await page.getByPlaceholder(t("manager:account.username")).fill(username)
  await page
    .getByPlaceholder(t("manager:users.temporaryPassword"))
    .fill("temporary-pass")
  await page.getByRole("button", { name: t("manager:users.add") }).click()

  await expect(page.getByText(username)).toBeVisible()

  await page.goto("/manager/config")
  await page.getByRole("button", { name: t("manager:logout") }).click()
  await expect(page).toHaveURL(/\/manager$/u)

  await page.getByPlaceholder(t("manager:account.username")).fill(username)
  await page
    .getByPlaceholder(t("manager:passwordPlaceholder"))
    .fill("temporary-pass")
  await page.getByRole("button", { name: t("manager:login.submit") }).click()

  await page
    .getByPlaceholder(t("manager:account.currentPassword"))
    .fill("temporary-pass")
  await page
    .getByPlaceholder(t("manager:account.newPassword"))
    .fill("my-own-password")
  await page
    .getByPlaceholder(t("manager:account.confirmPassword"))
    .fill("my-own-password")
  await page.getByRole("button", { name: t("common:submit") }).click()

  await expect(page.getByText(t("manager:configurationsTitle"))).toBeVisible()
  await expect(
    page.getByRole("button", { name: t("manager:users.title") }),
  ).toHaveCount(0)
})
