import { test, expect, type Page } from "@playwright/test";

async function applyPreset(page: Page, key: "empty" | "mid" | "full") {
  await page.keyboard.press("Control+Shift+KeyE");
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  await page.getByRole("button", { name: new RegExp(`^${label}\\b`) }).click();
  await page.keyboard.press("Control+Shift+KeyE");
}

test.describe("Welcome onboarding chat (empty preset)", () => {
  test("wave 0 → wave 1 → wave 2 → wave 3 navigation", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Добро пожаловать" })
    ).toBeVisible();

    // Wave 0 chips are visible
    await page
      .getByRole("button", { name: "Что такое сигнал и кампания?" })
      .click();

    // Wave 1 answer + wave 2 chips
    await expect(page.getByText("Сигнал — это момент, когда")).toBeVisible();
    await page
      .getByRole("button", { name: "Какие сценарии кампаний бывают?" })
      .click();

    // Wave 2 answer + wave 3 chips
    await expect(
      page.getByText("Платформа покрывает шесть типовых ситуаций")
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Как платформа узнаёт об активности моих клиентов?",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Создать первый сигнал →" })
    ).toBeVisible();
  });

  test("terminal chip opens LaunchFlyout", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Откуда берутся мои данные?" })
      .click();
    await page
      .getByRole("button", { name: "Как это соотносится с требованиями 152-ФЗ?" })
      .click();
    await page
      .getByRole("button", { name: "Создать первый сигнал →" })
      .click();

    await expect(page.getByRole("dialog", { name: "Запустить" })).toBeVisible();
  });

  test("history is reset when user leaves welcome and returns", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Что я могу сделать со своей базой?" })
      .click();
    await expect(page.getByText("База клиентов — это ваша точка")).toBeVisible();

    // Leave to Сигналы, then back via logo
    await page.getByRole("button", { name: "Сигналы" }).click();
    await expect(
      page.getByRole("heading", { name: "Добро пожаловать" })
    ).not.toBeVisible();
    await page.getByRole("button", { name: "На главный экран" }).click();

    // Back on welcome — wave 0 chips again, no history
    await expect(
      page.getByRole("heading", { name: "Добро пожаловать" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Что такое сигнал и кампания?" })
    ).toBeVisible();
    await expect(page.getByText("База клиентов — это ваша точка")).not.toBeVisible();
  });

  test("free-form submit adds user + bot messages to history", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByPlaceholder("Задайте вопрос…").fill("привет");
    await page.keyboard.press("Enter");

    await expect(page.getByText("привет", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Пока умею отвечать только на подсказки")
    ).toBeVisible();
  });
});

test.describe("Welcome post-onboarding (full preset, campaign launched)", () => {
  test("post-campaign welcome shows minimal caption and interface chips", async ({
    page,
  }) => {
    await page.goto("/");
    await applyPreset(page, "full");

    // Full preset seeds active/completed campaigns → isCampaignDone === true
    await expect(
      page.getByRole("heading", { name: "Добро пожаловать" })
    ).toBeVisible();
    await expect(page.getByText("Что вы хотите сделать")).toBeVisible();

    // Steps (Шаг 1..3) must be hidden
    await expect(
      page.getByRole("button", { name: /Шаг 1.*Получение сигнала/s })
    ).toHaveCount(0);

    // Post-onboarding chips visible
    await expect(
      page.getByRole("button", { name: "Создать новый сигнал" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Создать новую кампанию" })
    ).toBeVisible();
  });

  test("'Создать новую кампанию' replies with inline bot message", async ({
    page,
  }) => {
    await page.goto("/");
    await applyPreset(page, "full");

    await page
      .getByRole("button", { name: "Создать новую кампанию" })
      .click();

    await expect(
      page.getByText("Для этого выберите существующий сигнал или создайте новый.")
    ).toBeVisible();
    // Chips remain
    await expect(
      page.getByRole("button", { name: "Создать новую кампанию" })
    ).toBeVisible();
  });

  test("'Создать новый сигнал' starts the guided signal flow", async ({
    page,
  }) => {
    await page.goto("/");
    await applyPreset(page, "full");

    await page
      .getByRole("button", { name: "Создать новый сигнал" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Выберите тип сигнала" })
    ).toBeVisible();
  });
});
