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

/**
 * id модели — per-provider override, чтобы переключение провайдера не ломалось
 * о чужой override (напр. AFINA_AI_MODEL=gemini-* при активном deepseek).
 *  - deepseek: DEEPSEEK_MODEL ?? "deepseek-chat"
 *  - google:   GOOGLE_MODEL ?? AFINA_AI_MODEL (legacy) ?? "gemini-2.5-flash"
 */
export function defaultModelId(id: AiProviderId): string {
  if (id === "google") {
    return process.env.GOOGLE_MODEL ?? process.env.AFINA_AI_MODEL ?? "gemini-2.5-flash";
  }
  return process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
}

/** Сконструировать языковую модель активного провайдера для generateText. */
export function resolveModel(): LanguageModel {
  const id = activeProviderId();
  const modelId = defaultModelId(id);
  return id === "google" ? google(modelId) : deepseek(modelId);
}
