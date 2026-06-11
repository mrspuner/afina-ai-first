/**
 * POST /api/ai/workflow-ops
 *
 * Принимает свободный текст маркетинговой команды и краткую сводку нод графа,
 * возвращает массив StructuralOp[] — те же типы, что выдаёт regex-парсер.
 *
 * Архитектурная идея: AI заменяет парсер, но не аппликатор.
 * Весь пайплайн после этого эндпоинта (dispatch → applyOps → анимация)
 * не меняется ни на строчку — контракт одинаковый для AI и regex-пути.
 *
 * Privacy-граница: на сервер уходит только текст команды + типы/подписи нод
 * из мокового графа. Никакого аккаунтного контекста, никаких персональных данных.
 */

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { workflowOpsResultSchema } from "@/lib/ai-workflow-schema";

// Форма тела запроса от клиента
interface RequestBody {
  text: string;
  nodes: Array<{ id: string; label: string; nodeType: string }>;
}

// ── Системный промпт ──────────────────────────────────────────────────────────

/**
 * Словарь синонимов REF_SYNONYMS из src/state/structural-commands.ts (строка 55).
 * REF_SYNONYMS не экспортируется из structural-commands.ts (internal constant),
 * поэтому транскрибируем его содержимое сюда вручную.
 * При изменении словаря в structural-commands.ts — обновить и здесь.
 */
const REF_SYNONYMS_TEXT = `
Синонимы для распознавания нод по названию (ref):
- sms, смс → смс
- email, почта, mail, e-mail → email
- push, пуш → push
- звонок, ivr, call → звонок
- задержка, ожидание, пауза, wait, delay → задержка
- витрина, storefront → витрина
- лендинг, landing → лендинг
- успех, success → успех
- конец, end → конец
- условие, condition → условие
`.trim();

const SYSTEM_PROMPT = `Ты — ассистент, который переводит свободный текст маркетинговой команды
в структурированные операции для графа рекламного воркфлоу.

## Допустимые типы нод (nodeType)
Используй ТОЛЬКО эти значения в поле nodeType:
- sms — СМС-канал
- email — Email-канал
- push — Push-уведомление
- ivr — Звонок (IVR)
- wait — Задержка / пауза
- storefront — Витрина товаров
- landing — Лендинг
- condition — Условное ветвление
- success — Успешная конверсия (финальная нода)
- end — Конец без конверсии (финальная нода)

Не используй внутренние/служебные типы: default, channel, retarget, result, new, signal, split, merge.

## Допустимые операции (kind)
- add — добавить новую ноду
- remove — удалить ноду по её ref
- replace — заменить тип существующей ноды

## Размещение (placement)
Для операции add укажи placement:
- { "mode": "after", "ref": "<имя ноды>" } — вставить после указанной ноды
- { "mode": "before", "ref": "<имя ноды>" } — вставить перед указанной нодой
- { "mode": "between", "refA": "<нода А>", "refB": "<нода Б>" } — между двумя нодами
- { "mode": "auto" } — система сама выберет место (используй если позиция не указана)

## Разрешение ref (имени ноды)
Поле ref — это то, как пользователь называет существующую ноду в команде.
Используй label из списка нод графа (nodes), учитывая синонимы:

${REF_SYNONYMS_TEXT}

Например: если пользователь пишет «после пуша», а в графе есть нода с label «Push» —
используй ref = "Push" (точное название из графа, а не синоним).

## Правило неопределённости
Если команда неоднозначна, непонятна или не относится к изменению структуры графа —
верни пустой массив ops: []. Никогда не угадывай.

## Формат ответа
JSON-объект: { "ops": [ ... ] }
Массив ops содержит операции в порядке выполнения.`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Проверяем наличие ключа до разбора тела — быстрый путь к fallback
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // Клиент при 503 уйдёт в regex-fallback; это не ошибка, а штатный режим
    return Response.json({ error: "no-key" }, { status: 503 });
  }

  // Разбираем тело запроса защитно
  let body: Partial<RequestBody>;
  try {
    body = (await request.json()) as Partial<RequestBody>;
  } catch {
    return Response.json({ error: "invalid-json" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const nodes = Array.isArray(body.nodes) ? body.nodes : [];

  if (!text) {
    return Response.json({ error: "empty-text" }, { status: 400 });
  }

  // Формируем краткую сводку графа для промпта
  // Передаём только label и nodeType — не весь стейт, не параметры нод
  const nodesSummary =
    nodes.length > 0
      ? nodes
          .map((n) => `- id: ${n.id}, label: "${n.label}", type: ${n.nodeType}`)
          .join("\n")
      : "(граф пустой или не передан)";

  const userPrompt = `Список нод текущего графа:\n${nodesSummary}\n\nКоманда пользователя:\n${text}`;

  // Выбор модели: env-переменная или дефолт
  // "gemini-2.5-flash" — id актуальной Flash-модели на момент написания (2026-06-11)
  // Сверено с @ai-sdk/google@3.0.80 (models в package types / README)
  const modelId = process.env.AFINA_AI_MODEL ?? "gemini-2.5-flash";

  try {
    // generateObject — @deprecated в ai@6 (forward path: generateText with output: "object").
    // Миграция отложена: на момент спайка generateObject работает корректно и
    // является наиболее читаемым способом получить типизированный объект.
    // TODO: перейти на generateText({ output: "object", ... }) при следующей крупной задаче по AI-стеку.
    const { object } = await generateObject({
      model: google(modelId),
      schema: workflowOpsResultSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });

    // Текст команды и ответ модели не логируем — privacy-граница
    return Response.json(object, { status: 200 });
  } catch (err) {
    // Определяем тип ошибки для правильного статус-кода клиенту
    // Клиент оба 502-варианта трактует одинаково — уходит в regex-fallback
    const errStr = String(err);
    const isRateLimit =
      errStr.includes("429") ||
      errStr.toLowerCase().includes("rate") ||
      errStr.toLowerCase().includes("quota");

    // Логируем только тип ошибки, без текста команды и ответа модели
    console.error(
      "[ai/workflow-ops] LLM call failed:",
      isRateLimit ? "rate-limited" : "ai-failed"
    );

    return Response.json(
      { error: isRateLimit ? "rate-limited" : "ai-failed" },
      { status: 502 }
    );
  }
}
