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
