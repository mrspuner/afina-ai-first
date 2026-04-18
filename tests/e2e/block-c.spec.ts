import { test, expect, type Page } from "@playwright/test";

async function applyPreset(page: Page, key: "empty" | "mid" | "full") {
  await page.keyboard.press("Control+Shift+KeyD");
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  await page.getByRole("button", { name: new RegExp(`^${label}\\b`) }).click();
  await page.keyboard.press("Control+Shift+KeyD");
}

async function openFirstDraftCampaign(page: Page) {
  await page.getByRole("button", { name: "Кампании", exact: true }).click();
  const draft = page
    .locator("[data-slot=card]")
    .filter({ hasText: "Не запущено" })
    .first();
  await draft.click();
  await expect(page.locator(".react-flow")).toBeVisible({ timeout: 5_000 });
}

function headerLaunchButton(page: Page) {
  return page.locator('[data-slot="button"]').filter({ hasText: /^Запустить$/ });
}

test.describe("Block C — Canvas header", () => {
  test("renders name, signal line, and action buttons", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openFirstDraftCampaign(page);

    await expect(page.getByRole("button", { name: "Сохранить черновик" })).toBeVisible();
    await expect(headerLaunchButton(page)).toBeVisible();
    // Signal line matches "Тип · count · от dd.MM"
    await expect(page.getByText(/·\s+от\s+\d{2}\.\d{2}/)).toBeVisible();
  });

  test("rename persists and propagates to campaign list", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openFirstDraftCampaign(page);

    await page
      .getByRole("button", { name: "Переименовать кампанию" })
      .click();
    const input = page.getByRole("textbox", { name: "Название кампании" });
    await input.fill("Переименованная кампания");
    await input.press("Enter");
    await expect(
      page.getByRole("button", { name: "Переименовать кампанию" })
    ).toContainText("Переименованная кампания");

    await page.getByRole("button", { name: "Кампании", exact: true }).click();
    await expect(page.getByText("Переименованная кампания")).toBeVisible();
  });

  test("launch transitions campaign to active status and shows status panel", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openFirstDraftCampaign(page);

    await headerLaunchButton(page).click();
    await expect(page.getByText("Кампания запущена")).toBeVisible({ timeout: 5_000 });
  });

  test("save-draft button shows info toast", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openFirstDraftCampaign(page);

    await page.getByRole("button", { name: "Сохранить черновик" }).click();
    await expect(page.getByText("Черновик сохранён")).toBeVisible();
  });
});
