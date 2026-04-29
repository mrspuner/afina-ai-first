import { test, expect } from "@playwright/test";
import path from "node:path";

test("happy path: welcome → guided signal → campaign type → launch → stats", async ({ page }) => {
  await page.goto("/");

  // 1. Welcome
  await expect(page.getByRole("heading", { name: "Добро пожаловать" })).toBeVisible();

  // 2. Click Шаг 1 badge → guided signal flow
  await page.getByRole("button", { name: /Шаг 1.*Получение сигнала/s }).click();

  // 3. Step 1: pick scenario (auto-advances on click)
  await expect(page.getByRole("heading", { name: "Выберите тип сигнала" })).toBeVisible();
  await page.getByRole("button", { name: /Регистрация/ }).first().click();

  // 4. Step 2: pick one interest tag + Продолжить (default direction → finance vertical)
  await expect(page.getByRole("heading", { name: /Какие интересы и триггеры/ })).toBeVisible();
  await page.getByRole("button", { name: "Кредитование" }).click();
  await page.getByRole("button", { name: "Продолжить" }).last().click();

  // 5. Step 3: pick segment + Продолжить
  await expect(page.getByRole("heading", { name: "Выберите сегменты сигнала" })).toBeVisible();
  await page.getByRole("button", { name: /Максимальный/ }).click();
  await page.getByRole("button", { name: "Продолжить" }).last().click();

  // 6. Step 4: enter budget + Далее
  await expect(page.getByRole("heading", { name: "Укажите максимальный бюджет" })).toBeVisible();
  await page.getByPlaceholder("Например, 500").fill("500");
  await page.getByRole("button", { name: "Далее" }).last().click();

  // 7. Step 5: upload file, Далее, wait hashing (~4.2s)
  await expect(page.getByRole("heading", { name: "Загрузите вашу базу" })).toBeVisible();
  const fixturePath = path.resolve(__dirname, "fixtures/test-base.csv");
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await expect(page.getByText("test-base.csv")).toBeVisible();
  await page.getByRole("button", { name: "Далее" }).last().click();

  // 8. Step 6: summary → top-up via dev panel, then launch
  await expect(page.getByRole("heading", { name: "Проверьте настройки сигнала" })).toBeVisible({
    timeout: 15_000,
  });
  // Seed balance via dev panel so launch doesn't open the top-up modal.
  await page.keyboard.press("Meta+Shift+E");
  await page.getByRole("button", { name: "+ ₽ 10 000" }).click();
  await page.keyboard.press("Meta+Shift+E");
  await page.getByRole("button", { name: "Запустить" }).first().click();

  // 9. Step 7: processing screen
  await expect(page.getByRole("heading", { name: "Ваша база обрабатывается" })).toBeVisible();

  // 10. Step 8: click Использовать в кампании
  await expect(page.getByRole("heading", { name: /Сигналы готовы/ })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "Использовать в кампании" }).click();

  // 11. CampaignTypeView: pick first campaign type
  await expect(page.getByText("Выберите тип кампании")).toBeVisible();
  await page.getByRole("button", { name: /Возврат брошенных действий/ }).click();

  // 12. CanvasHeader → Запустить (scoped: avoid sidebar's Запустить button)
  await page.locator('[data-slot="button"]').filter({ hasText: /^Запустить$/ }).click();

  // 13. Wait for campaign to be active (header shows active-state buttons)
  await expect(
    page.getByRole("button", { name: "Посмотреть статистику" })
  ).toBeVisible({ timeout: 5_000 });

  // 14. Click header button "Посмотреть статистику"
  await page
    .getByRole("button", { name: "Посмотреть статистику" })
    .click();

  // 15. StatisticsView visible (scoped to a campaign → campaign-stats heading)
  await expect(
    page.getByRole("heading", { name: "Статистика кампании" })
  ).toBeVisible();
});
