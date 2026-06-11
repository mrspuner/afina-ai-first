/**
 * Клиентский помощник для вызова /api/ai/workflow-ops.
 *
 * Зачем этот модуль:
 * - Изолирует fetch-логику и валидацию от prompt-composer.
 * - Возвращает null вместо любой ошибки — caller всегда уходит в regex-fallback.
 * - Таймаут 4 с через AbortSignal.timeout: LLM иногда зависает, UX не должен ждать.
 * - Zod-валидация ответа защищает от дрейфа контракта между клиентом и route handler:
 *   если схема разошлась, мы узнаём об этом здесь, а не в applyOps/dispatch.
 */

import type { StructuralOp } from "@/state/structural-commands";
import { workflowOpsResultSchema } from "@/lib/ai-workflow-schema";

// ── Проба доступности AI ──────────────────────────────────────────────────────

/**
 * Кэш результата пробы: храним промис, а не само значение, чтобы повторные
 * вызовы до завершения запроса тоже получали один общий промис (без дублирующих
 * fetch'ей). При ошибке кэш не сохраняется — следующий вызов повторит попытку.
 */
let _availabilityCache: Promise<boolean> | null = null;

/**
 * Проверить, доступен ли AI-парсер (есть ли ключ API на сервере).
 * Результат кэшируется на время жизни страницы — повторные вызовы возвращают
 * тот же промис без повторного запроса к серверу.
 * При любой ошибке (сеть, не-2xx, невалидный JSON) → false (AI недоступен).
 */
export function fetchAiAvailability(): Promise<boolean> {
  if (_availabilityCache !== null) return _availabilityCache;

  // Запускаем единственный запрос; при ошибке кэш сбрасывается, чтобы
  // следующий вызов мог повторить попытку.
  const req = fetch("/api/ai/workflow-ops", { method: "GET" })
    .then(async (res) => {
      if (!res.ok) return false;
      const json = (await res.json()) as unknown;
      if (
        typeof json === "object" &&
        json !== null &&
        "available" in json &&
        typeof (json as Record<string, unknown>).available === "boolean"
      ) {
        return (json as { available: boolean }).available;
      }
      return false;
    })
    .catch(() => false)
    .then((result) => {
      // Не кэшируем false — разрешаем повторную попытку при следующем вызове.
      if (!result) _availabilityCache = null;
      return result;
    });

  _availabilityCache = req;
  return req;
}

/** Описание ноды, уходящее на сервер. Только id + метка + тип — никакого стейта. */
export interface WorkflowNodeSummary {
  id: string;
  label: string;
  nodeType: string;
}

/**
 * Запросить структурные операции у AI-эндпоинта.
 *
 * @param text  Свободный текст команды пользователя.
 * @param nodes Краткая сводка текущего графа (типы и метки нод).
 *              Privacy-граница: на сервер уходят только типы и метки, не весь стейт.
 * @returns     Массив операций при успехе; null — если нужно уйти в regex-fallback.
 *              null возвращается при: не-2xx ответе, исключении/таймауте, пустом
 *              массиве ops, невалидной схеме ответа.
 */
export async function fetchAiStructuralOps(
  text: string,
  nodes: WorkflowNodeSummary[],
): Promise<StructuralOp[] | null> {
  try {
    // AbortSignal.timeout — встроен в браузер (Chrome 103+, FF 100+, Safari 16.4+).
    // 4 с достаточно для Flash при нормальной сети; при квоте free tier (429)
    // route handler вернёт 502 раньше таймаута.
    const response = await fetch("/api/ai/workflow-ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, nodes }),
      signal: AbortSignal.timeout(4000),
    });

    // Не-2xx (503 no-key, 502 ai-failed/rate-limited, 4xx) → fallback на regex.
    if (!response.ok) return null;

    const json: unknown = await response.json();

    // Валидируем ответ zod-схемой — защита от дрейфа контракта.
    // safeParse не бросает исключений; при ошибке уходим в fallback.
    const parsed = workflowOpsResultSchema.safeParse(json);
    if (!parsed.success) return null;

    // Пустой массив ops — LLM не распознал команду → fallback на regex.
    if (parsed.data.ops.length === 0) return null;

    return parsed.data.ops;
  } catch {
    // fetch-исключение (AbortError по таймауту, NetworkError, SyntaxError из json()) →
    // fallback на regex; ошибка не всплывает выше.
    return null;
  }
}
