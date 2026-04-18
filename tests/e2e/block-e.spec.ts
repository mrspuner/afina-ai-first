import { test, expect, type Page } from "@playwright/test";

async function applyPreset(page: Page, key: "empty" | "mid" | "full") {
  await page.keyboard.press("Control+Shift+KeyD");
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  await page.getByRole("button", { name: new RegExp(`^${label}\\b`) }).click();
  await page.keyboard.press("Control+Shift+KeyD");
}

async function openAnyDraftCampaign(page: Page) {
  await page.getByRole("button", { name: "Кампании", exact: true }).click();
  const draft = page
    .locator("[data-slot=card]")
    .filter({ hasText: "Не запущено" })
    .first();
  await draft.click();
  await expect(page.locator(".react-flow")).toBeVisible({ timeout: 5_000 });
}

test.describe("Block E — Node control + AI cycle", () => {
  test("click node opens control panel and injects @tag", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openAnyDraftCampaign(page);

    const signalNode = page.locator('[data-node-type="signal"]').first();
    await signalNode.click();

    await expect(page.getByTestId("node-control-panel")).toBeVisible();
    // textarea автоматически префиксуется @Сигнал
    const textarea = page.getByRole("textbox").first();
    await expect(textarea).toHaveValue(/^@/);
  });

  test("submit prompt updates node sublabel and shows AI reply", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openAnyDraftCampaign(page);

    // выбираем первый email-канал (регистрация-шаблон содержит email) или
    // любую коммуникационную ноду из текущего шаблона
    const comms = page.locator(
      '[data-node-type="email"], [data-node-type="sms"], [data-node-type="push"], [data-node-type="ivr"]'
    );
    await comms.first().click();
    await expect(page.getByTestId("node-control-panel")).toBeVisible();

    const textarea = page.getByRole("textbox").first();
    await textarea.fill("@demo Задержка 2 часа");
    await textarea.press("Enter");

    await expect(page.getByText(/AI: Готово, обновил ноду/)).toBeVisible({ timeout: 2_000 });
    // Дождаться applied sublabel — для задержки шаблон выдаёт "Задержка 2 ч"
    await expect(page.locator('text="Задержка 2 ч"').first()).toBeVisible({ timeout: 4_000 });
  });

  test("pane click closes the control panel", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "mid");
    await openAnyDraftCampaign(page);

    await page.locator('[data-node-type="signal"]').first().click();
    await expect(page.getByTestId("node-control-panel")).toBeVisible();

    // клик по заднику канваса (ReactFlow viewport)
    await page.locator(".react-flow__pane").click({ position: { x: 20, y: 20 } });
    await expect(page.getByTestId("node-control-panel")).toBeHidden();
  });
});
