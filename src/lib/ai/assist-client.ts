import {
  assistResultSchema,
  assistResponseSchema,
  type AssistRequest,
  type AssistResult,
} from "./assist-contract";
import { appendAiLogEntry, type AiLogEntry } from "@/state/dev-config";

/**
 * Кэш результата пробы: храним промис, а не само значение, чтобы повторные
 * вызовы до завершения запроса тоже получали один общий промис (без дублирующих
 * fetch'ей). При ошибке кэш не сохраняется — следующий вызов повторит попытку.
 */
let availabilityCache: Promise<boolean> | null = null;

/**
 * Проверить, доступен ли AI-оркестратор (есть ли ключ API на сервере).
 * Результат кэшируется на время жизни страницы — повторные вызовы возвращают
 * тот же промис без повторного запроса к серверу.
 * При любой ошибке (сеть, не-2xx, невалидный JSON) → false (AI недоступен).
 */
export function fetchAssistAvailability(): Promise<boolean> {
  if (availabilityCache !== null) return availabilityCache;

  // Запускаем единственный запрос; при ошибке кэш сбрасывается, чтобы
  // следующий вызов мог повторить попытку.
  const req = fetch("/api/ai/assist")
    .then(async (r) => {
      if (!r.ok) return false;
      const json = (await r.json()) as unknown;
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
      if (!result) availabilityCache = null;
      return result;
    });

  availabilityCache = req;
  return req;
}

// ── Журнал AI-обменов (план 007) ─────────────────────────────────────────────

function outcomeOf(results: AssistResult[]): AiLogEntry["outcome"] {
  if (results.some((r) => !["answer", "clarify", "none"].includes(r.kind))) return "applied";
  if (results.some((r) => r.kind === "clarify")) return "clarify";
  if (results.some((r) => r.kind === "answer")) return "answer";
  return "fallback";
}

function logExchange(text: string, results: AssistResult[] | null): void {
  appendAiLogEntry({
    at: new Date().toISOString(),
    text,
    resultKinds: results ? results.map((r) => r.kind) : [],
    outcome: results ? outcomeOf(results) : "fallback",
  });
}

/**
 * Общий хелпер: POST /api/ai/assist и вернуть сырой JSON или null при сбое.
 */
async function postAssist(req: AssistRequest): Promise<unknown> {
  const res = await fetch("/api/ai/assist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Вызов оркестратора. null = любой сбой (таймаут 6с, не-2xx, невалидный
 * ответ) — вызывающий уходит в офлайн-fallback.
 *
 * @deprecated Мигрируйте на fetchAssistMulti (план 006)
 */
export async function fetchAssist(req: AssistRequest): Promise<AssistResult | null> {
  try {
    const json = await postAssist(req);
    if (json === null) return null;
    const parsed = assistResultSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Вызов оркестратора с поддержкой multi-tool ответа (план 006).
 * Сначала пробует assistResponseSchema ({results:[...]}); при провале —
 * пробует assistResultSchema (старый одиночный формат, оборачивает в массив).
 * null = любой сбой.
 */
export async function fetchAssistMulti(req: AssistRequest): Promise<AssistResult[] | null> {
  try {
    const json = await postAssist(req);
    if (json === null) {
      logExchange(req.text, null);
      return null;
    }

    // Новый формат: { results: [...] }
    const multi = assistResponseSchema.safeParse(json);
    if (multi.success) {
      logExchange(req.text, multi.data.results);
      return multi.data.results;
    }

    // Старый формат: одиночный AssistResult
    const single = assistResultSchema.safeParse(json);
    if (single.success) {
      logExchange(req.text, [single.data]);
      return [single.data];
    }

    logExchange(req.text, null);
    return null;
  } catch {
    logExchange(req.text, null);
    return null;
  }
}
