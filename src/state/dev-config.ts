/**
 * Dev-only knobs persisted in localStorage. The dev-panel writes to these and
 * runtime code (signal-processing flows) reads from them. Defaults are tuned
 * to match the original hardcoded values so behaviour is unchanged when no
 * override is set.
 */

export const DEV_PROCESSING_KEY = "afina.dev.processingMs";

const DEFAULT_PROCESSING_MS = 6000;

export interface ProcessingPreset {
  /** Duration in ms. `Number.POSITIVE_INFINITY` means "do not auto-complete". */
  value: number;
  label: string;
}

export const PROCESSING_PRESETS: ProcessingPreset[] = [
  { value: 6000, label: "6 сек" },
  { value: 30000, label: "30 сек" },
  { value: 120000, label: "2 мин" },
  { value: Number.POSITIVE_INFINITY, label: "Не завершать" },
];

/**
 * Read the configured processing duration. SSR-safe: returns the default on
 * the server. `Infinity` is preserved through localStorage round-trip.
 */
export function getProcessingDuration(): number {
  if (typeof window === "undefined") return DEFAULT_PROCESSING_MS;
  const raw = window.localStorage.getItem(DEV_PROCESSING_KEY);
  if (raw === null) return DEFAULT_PROCESSING_MS;
  if (raw === "Infinity") return Number.POSITIVE_INFINITY;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PROCESSING_MS;
  return parsed;
}

export function setProcessingDuration(ms: number): void {
  if (typeof window === "undefined") return;
  if (ms === Number.POSITIVE_INFINITY) {
    window.localStorage.setItem(DEV_PROCESSING_KEY, "Infinity");
    return;
  }
  window.localStorage.setItem(DEV_PROCESSING_KEY, String(ms));
}

// ── AI-парсер (спайк 002, auto-on) ───────────────────────────────────────────
// Флаг управляет режимом обработки свободного текста в prompt-composer.
//
// Дефолт теперь AUTO-ON: приложение пробует AI всегда, когда ключ API
// присутствует на сервере (проверяется через GET /api/ai/workflow-ops).
// При ошибке / таймауте / пустом ответе — fallback на regex (как раньше).
//
// Безопасность e2e/CI обеспечивается через пробу доступности:
//   нет ключа → fetchAiAvailability() = false → prompt-composer идёт
//   напрямую в синхронный dispatch без await — поведение бит-в-бит как до спайка.
//
// Переключатель в дев-панели позволяет ПРИНУДИТЕЛЬНО отключить AI
// (записывает "off") — например, чтобы убедиться, что regex-путь ещё работает.
// "on" / null (не задан) → auto-режим (AI когда есть ключ).

export const DEV_AI_PARSER_KEY = "afina.dev.aiParser";

/**
 * Включён ли реальный AI-парсер структурных команд.
 * Дефолт — ON (auto): возвращает true, если флаг не задан или задан явно "on".
 * Возвращает false только если явно записано "off" (принудительный regex-режим).
 * SSR-safe: на сервере возвращает true (концептуальный дефолт auto-on;
 * composer читает это только на клиенте — в обработчиках/эффектах, без риска
 * гидрационного рассогласования).
 */
export function isAiParserEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(DEV_AI_PARSER_KEY) !== "off";
}

export function setAiParserEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEV_AI_PARSER_KEY, enabled ? "on" : "off");
}
