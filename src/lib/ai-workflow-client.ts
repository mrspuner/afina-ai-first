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
