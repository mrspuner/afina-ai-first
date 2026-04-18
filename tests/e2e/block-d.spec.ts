import { test, expect, type Page } from "@playwright/test";

async function applyPreset(page: Page, key: "empty" | "mid" | "full") {
  await page.keyboard.press("Control+Shift+KeyD");
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  await page.getByRole("button", { name: new RegExp(`^${label}\\b`) }).click();
  await page.keyboard.press("Control+Shift+KeyD");
}

async function createCampaignForSignal(page: Page, signalType: string) {
  await page.getByRole("button", { name: "Сигналы", exact: true }).click();
  const card = page
    .locator("[data-slot=card]")
    .filter({ hasText: new RegExp(signalType) })
    .first();
  await card.getByRole("button", { name: "Создать кампанию" }).click();
  await expect(page.locator(".react-flow")).toBeVisible({ timeout: 5_000 });
}

test.describe("Block D — Workflow templates", () => {
  test("Апсейл template shows split with multiple channels and success", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "full");
    await createCampaignForSignal(page, "Апсейл");

    await expect(page.locator('[data-node-type="split"]')).toBeVisible();
    await expect(page.locator('[data-node-type="storefront"]')).toBeVisible();
    await expect(page.locator('[data-node-type="email"]')).toBeVisible();
    await expect(page.locator('[data-node-type="sms"]')).toBeVisible();
    await expect(page.locator('[data-node-type="success"]')).toBeVisible();
  });

  test("Удержание template shows IVR channel", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "full");
    await createCampaignForSignal(page, "Удержание");

    await expect(page.locator('[data-node-type="ivr"]')).toBeVisible();
    await expect(page.locator('[data-node-type="success"]')).toBeVisible();
  });

  test("Регистрация template shows wait node between email and push", async ({ page }) => {
    await page.goto("/");
    await applyPreset(page, "full");
    await createCampaignForSignal(page, "Регистрация");

    await expect(page.locator('[data-node-type="email"]')).toBeVisible();
    await expect(page.locator('[data-node-type="wait"]')).toBeVisible();
    await expect(page.locator('[data-node-type="push"]')).toBeVisible();
  });
});
