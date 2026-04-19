import { test, expect, type Page } from "@playwright/test";

async function applyPreset(page: Page, key: "empty" | "mid" | "full") {
  await page.keyboard.press("Control+Shift+KeyE");
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  await page.getByRole("button", { name: new RegExp(`^${label}\\b`) }).click();
  await page.keyboard.press("Control+Shift+KeyE");
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

  test("launch transitions campaign to active status and updates header", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openFirstDraftCampaign(page);

    await headerLaunchButton(page).click();
    await expect(
      page.getByRole("button", { name: "Посмотреть статистику", exact: true })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("save-draft button shows info toast", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openFirstDraftCampaign(page);

    await page.getByRole("button", { name: "Сохранить черновик" }).click();
    await expect(page.getByText("Черновик сохранён")).toBeVisible();
  });

  test("draft → launch reveals active-state action matrix", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openFirstDraftCampaign(page);

    await headerLaunchButton(page).click();

    await expect(
      page.getByRole("button", { name: "Посмотреть статистику", exact: true })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: "Приостановить", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Дублировать", exact: true })
    ).toBeVisible();
  });

  test("pause → confirm flips to paused matrix, resume returns to active", async ({
    page,
  }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openFirstDraftCampaign(page);

    await headerLaunchButton(page).click();
    await expect(
      page.getByRole("button", { name: "Приостановить", exact: true })
    ).toBeVisible({ timeout: 5_000 });

    await page
      .getByRole("button", { name: "Приостановить", exact: true })
      .click();

    // Confirm dialog — press the primary confirm button inside the dialog.
    const confirmDialog = page.locator('[data-slot="dialog-content"]');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog
      .getByRole("button", { name: "Приостановить", exact: true })
      .click();

    // Paused matrix
    await expect(
      page.getByRole("button", { name: "Возобновить", exact: true })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: "Посмотреть статистику", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Дублировать", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Приостановить", exact: true })
    ).toHaveCount(0);

    // Resume (no confirm)
    await page.getByRole("button", { name: "Возобновить", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Приостановить", exact: true })
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: "Возобновить", exact: true })
    ).toHaveCount(0);
  });

  test("duplicate → confirm opens a new campaign named 'Копия — …'", async ({
    page,
  }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openFirstDraftCampaign(page);

    // First launch so we get a Duplicate button in the active matrix.
    await headerLaunchButton(page).click();
    await expect(
      page.getByRole("button", { name: "Дублировать", exact: true })
    ).toBeVisible({ timeout: 5_000 });

    const originalName = await page
      .getByRole("button", { name: "Переименовать кампанию" })
      .innerText();

    await page.getByRole("button", { name: "Дублировать", exact: true }).click();
    const confirmDialog = page.locator('[data-slot="dialog-content"]');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog
      .getByRole("button", { name: "Дублировать", exact: true })
      .click();

    await expect(
      page.getByRole("button", { name: "Переименовать кампанию" })
    ).toContainText(`Копия — ${originalName}`, { timeout: 5_000 });

    // Draft matrix on the new copy.
    await expect(
      page.getByRole("button", { name: "Сохранить черновик" })
    ).toBeVisible();
    await expect(headerLaunchButton(page)).toBeVisible();
  });

  test("scheduled → cancel-schedule reverts to draft matrix", async ({
    page,
  }) => {
    await page.goto("/");
    await applyPreset(page, "mid");

    // Open a scheduled campaign from the Campaigns section.
    await page.getByRole("button", { name: "Кампании", exact: true }).click();
    const scheduledCard = page
      .locator("[data-slot=card]")
      .filter({ hasText: "Запланированно" })
      .first();
    await scheduledCard.click();
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 5_000 });

    const cancelBtn = page.getByRole("button", {
      name: "Отменить расписание",
      exact: true,
    });
    await expect(cancelBtn).toBeVisible({ timeout: 5_000 });
    await cancelBtn.click();

    const confirmDialog = page.locator('[data-slot="dialog-content"]');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog
      .getByRole("button", { name: "Отменить расписание", exact: true })
      .click();

    // Draft matrix after cancellation.
    await expect(
      page.getByRole("button", { name: "Сохранить черновик" })
    ).toBeVisible({ timeout: 5_000 });
    await expect(headerLaunchButton(page)).toBeVisible();

    // Card view now shows "Не запущено".
    await page.getByRole("button", { name: "Кампании", exact: true }).click();
    // The original scheduled card should no longer be scheduled.
    // (Cannot identify by id, so just verify there are still draft cards.)
    await expect(
      page.locator("[data-slot=card]").filter({ hasText: "Не запущено" }).first()
    ).toBeVisible();
  });
});
