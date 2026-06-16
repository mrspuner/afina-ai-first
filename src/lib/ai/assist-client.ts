import {
  assistResultSchema,
  assistResponseSchema,
  type AssistRequest,
  type AssistResult,
} from "./assist-contract";

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

// ── Метаданные последнего вызова ─────────────────────────────────────────────
// Логирование журнала живёт в раннере (он знает screen/route/offline). Клиент
// лишь сообщает причину сбоя и latency последнего вызова через readLastAssistMeta.

export const ASSIST_TIMEOUT_MS = 20000;

export type AssistErrorReason = "timeout" | "no-key" | "rate-limited" | "ai-failed";

interface AssistMeta {
  errorReason: AssistErrorReason | null;
  latencyMs: number;
}

let lastMeta: AssistMeta = { errorReason: null, latencyMs: 0 };

/** Причина сбоя и latency самого последнего вызова postAssist. */
export function readLastAssistMeta(): AssistMeta {
  return lastMeta;
}

/**
 * Общий хелпер: POST /api/ai/assist и вернуть сырой JSON или null при сбое.
 * Заполняет lastMeta (errorReason/latencyMs) для журнала раннера.
 */
async function postAssist(req: AssistRequest): Promise<unknown> {
  const start = Date.now();
  lastMeta = { errorReason: null, latencyMs: 0 };
  try {
    const res = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(ASSIST_TIMEOUT_MS),
    });
    lastMeta.latencyMs = Date.now() - start;
    if (!res.ok) {
      lastMeta.errorReason =
        res.status === 503
          ? "no-key"
          : res.status === 502
            ? await read502Reason(res)
            : "ai-failed";
      return null;
    }
    return res.json();
  } catch (err) {
    lastMeta.latencyMs = Date.now() - start;
    // AbortSignal.timeout → DOMException name "TimeoutError".
    lastMeta.errorReason =
      (err as Error)?.name === "TimeoutError" ? "timeout" : "ai-failed";
    return null;
  }
}

async function read502Reason(res: Response): Promise<AssistErrorReason> {
  try {
    const body = (await res.json()) as { error?: string };
    return body?.error === "rate-limited" ? "rate-limited" : "ai-failed";
  } catch {
    return "ai-failed";
  }
}

/**
 * Вызов оркестратора. null = любой сбой (таймаут, не-2xx, невалидный
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
 * null = любой сбой. Журналирование — на стороне раннера.
 */
export async function fetchAssistMulti(req: AssistRequest): Promise<AssistResult[] | null> {
  try {
    const json = await postAssist(req);
    if (json === null) return null;

    // Новый формат: { results: [...] }
    const multi = assistResponseSchema.safeParse(json);
    if (multi.success) return multi.data.results;

    // Старый формат: одиночный AssistResult
    const single = assistResultSchema.safeParse(json);
    if (single.success) return [single.data];

    return null;
  } catch {
    return null;
  }
}
