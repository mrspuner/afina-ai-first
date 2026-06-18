import { describe, it, expect, afterEach } from "vitest";
import { activeProviderId, providerKeyPresent, defaultModelId } from "./provider";

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("activeProviderId", () => {
  it("по умолчанию deepseek", () => {
    delete process.env.AFINA_AI_PROVIDER;
    expect(activeProviderId()).toBe("deepseek");
  });

  it("google только при явном флаге", () => {
    process.env.AFINA_AI_PROVIDER = "google";
    expect(activeProviderId()).toBe("google");
  });

  it("неизвестное значение → deepseek", () => {
    process.env.AFINA_AI_PROVIDER = "openai";
    expect(activeProviderId()).toBe("deepseek");
  });
});

describe("providerKeyPresent", () => {
  it("читает ключ нужного провайдера", () => {
    process.env.DEEPSEEK_API_KEY = "x";
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    expect(providerKeyPresent("deepseek")).toBe(true);
    expect(providerKeyPresent("google")).toBe(false);
  });

  it("без ключа → false", () => {
    delete process.env.DEEPSEEK_API_KEY;
    expect(providerKeyPresent("deepseek")).toBe(false);
  });
});

describe("defaultModelId", () => {
  it("дефолт по провайдеру", () => {
    delete process.env.AFINA_AI_MODEL;
    delete process.env.DEEPSEEK_MODEL;
    delete process.env.GOOGLE_MODEL;
    expect(defaultModelId("deepseek")).toBe("deepseek-chat");
    expect(defaultModelId("google")).toBe("gemini-2.5-flash");
  });

  it("per-provider override независим", () => {
    process.env.DEEPSEEK_MODEL = "deepseek-v4-flash";
    process.env.GOOGLE_MODEL = "gemini-2.5-pro";
    expect(defaultModelId("deepseek")).toBe("deepseek-v4-flash");
    expect(defaultModelId("google")).toBe("gemini-2.5-pro");
  });

  it("чужой AFINA_AI_MODEL (legacy, gemini) НЕ протекает в deepseek", () => {
    delete process.env.DEEPSEEK_MODEL;
    delete process.env.GOOGLE_MODEL;
    process.env.AFINA_AI_MODEL = "gemini-2.5-flash-lite";
    expect(defaultModelId("deepseek")).toBe("deepseek-chat");
    expect(defaultModelId("google")).toBe("gemini-2.5-flash-lite");
  });
});
