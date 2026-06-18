import { google } from "@ai-sdk/google";
import { deepseek } from "@ai-sdk/deepseek";
import type { LanguageModel } from "ai";

/**
 * Выбор провайдера ИИ. По умолчанию — deepseek (дёшево для тестов); Gemini
 * остаётся доступен через AFINA_AI_PROVIDER=google (безопасный откат).
 * Логика вынесена сюда, чтобы тестировать без сетевых вызовов и не размазывать
 * env-ветвления по route.ts.
 */
export type AiProviderId = "deepseek" | "google";

/** Активный провайдер: google только при явном AFINA_AI_PROVIDER=google. */
export function activeProviderId(): AiProviderId {
  return process.env.AFINA_AI_PROVIDER === "google" ? "google" : "deepseek";
}

/** Есть ли ключ активного провайдера на сервере (для GET-пробы и быстрого 503). */
export function providerKeyPresent(id: AiProviderId): boolean {
  return id === "google"
    ? Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    : Boolean(process.env.DEEPSEEK_API_KEY);
}

/** id модели: явный AFINA_AI_MODEL имеет приоритет, иначе дефолт провайдера. */
export function defaultModelId(id: AiProviderId): string {
  if (process.env.AFINA_AI_MODEL) return process.env.AFINA_AI_MODEL;
  return id === "google" ? "gemini-2.5-flash" : "deepseek-chat";
}

/** Сконструировать языковую модель активного провайдера для generateText. */
export function resolveModel(): LanguageModel {
  const id = activeProviderId();
  const modelId = defaultModelId(id);
  return id === "google" ? google(modelId) : deepseek(modelId);
}
