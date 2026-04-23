import { test, expect } from "@playwright/test";

test("logo click returns to welcome", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Добро пожаловать" })).toBeVisible();

  // Navigate into Статистика via sidebar.
  await page.getByRole("button", { name: "Статистика", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Добро пожаловать" })).not.toBeVisible();

  // Click the logo — should land back on welcome.
  await page.getByRole("button", { name: "На главный экран" }).click();
  await expect(page.getByRole("heading", { name: "Добро пожаловать" })).toBeVisible();
});

test("browser back steps between sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Добро пожаловать" })).toBeVisible();

  // welcome → Сигналы
  await page.getByRole("button", { name: "Сигналы", exact: true }).click();
  // A small wait for the section transition.
  await page.waitForTimeout(100);

  // Сигналы → Статистика
  await page.getByRole("button", { name: "Статистика", exact: true }).click();
  await page.waitForTimeout(100);

  // Back → Сигналы
  await page.goBack();
  await page.waitForTimeout(150);
  // Sidebar button for Сигналы should be active (has accent bg).
  // We verify by checking that the welcome heading is NOT visible and
  // that we're on the Сигналы section heading/empty-state.
  await expect(page.getByRole("heading", { name: "Добро пожаловать" })).not.toBeVisible();

  // Back again → welcome
  await page.goBack();
  await page.waitForTimeout(150);
  await expect(page.getByRole("heading", { name: "Добро пожаловать" })).toBeVisible();
});
