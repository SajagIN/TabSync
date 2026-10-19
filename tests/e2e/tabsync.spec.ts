import { expect, test } from "@playwright/test"

async function clearPreferences(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/")
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

test.describe("TabSync preferences", () => {
  test("updates theme in every open tab and restores it after reload", async ({
    page,
    context,
  }) => {
    await clearPreferences(page)
    await expect(page).toHaveTitle(/TabSync/)

    const secondTab = await context.newPage()
    await secondTab.goto("/")
    await page.getByRole("button", { name: "Dark" }).click()

    await expect(page.locator("html")).toHaveClass(/dark/)
    await expect(secondTab.locator("html")).toHaveClass(/dark/)
    await expect(page.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true")

    await page.reload()
    await expect(page.locator("html")).toHaveClass(/dark/)
    await secondTab.close()
  })

  test("synchronizes translated copy and document language", async ({ page, context }) => {
    await clearPreferences(page)
    const secondTab = await context.newPage()
    await secondTab.goto("/")

    await page.locator("#language-select").selectOption("hi")
    await expect(page.locator("html")).toHaveAttribute("lang", "hi")
    await expect(page.getByRole("heading", { name: "पसंद" })).toBeVisible()
    await expect(secondTab.getByRole("heading", { name: "पसंद" })).toBeVisible()
    await expect(secondTab.locator("html")).toHaveAttribute("lang", "hi")
    await secondTab.close()
  })

  test("synchronizes the font-size preview", async ({ page, context }) => {
    await clearPreferences(page)
    const secondTab = await context.newPage()
    await secondTab.goto("/")

    await page.locator("#font-size-slider").evaluate((element) => {
      const input = element as HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      setter?.call(input, "22")
      input.dispatchEvent(new Event("input", { bubbles: true }))
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })

    await expect(page.locator(".preview-copy")).toHaveCSS("font-size", "22px")
    await expect(secondTab.locator(".preview-copy")).toHaveCSS("font-size", "22px")
    await secondTab.close()
  })

  test("uses the storage-event transport fallback", async ({ page, context }) => {
    await page.goto("/?transport=storage")
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    const secondTab = await context.newPage()
    await secondTab.goto("/?transport=storage")

    await page.getByRole("button", { name: "Dark" }).click()
    await expect(secondTab.locator("html")).toHaveClass(/dark/)
    await expect(secondTab.getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await secondTab.close()
  })

  test("shows the current state and per-field versions in diagnostics", async ({ page }) => {
    await clearPreferences(page)
    await page.getByRole("button", { name: "Dark" }).click()
    await page.getByText("Diagnostics").click()

    await expect(page.getByRole("tab", { name: "State" })).toBeVisible()
    await expect(page.locator(".json-block")).toContainText('"value": "dark"')
    await page.getByRole("tab", { name: "Versions" }).click()
    await expect(page.getByRole("table", { name: "Versions" })).toBeVisible()
    await expect(page.locator(".version-table")).toContainText("theme")
  })
})
