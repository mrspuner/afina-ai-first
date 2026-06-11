import {
  assistResultSchema,
  type AssistRequest,
  type AssistResult,
} from "./assist-contract";

let availabilityCache: Promise<boolean> | null = null;

/** GET-проба ключа; кэш на page lifetime (как fetchAiAvailability спайка). */
export function fetchAssistAvailability(): Promise<boolean> {
  if (!availabilityCache) {
    availabilityCache = fetch("/api/ai/assist")
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((j: { available?: boolean }) => Boolean(j.available))
      .catch(() => false);
  }
  return availabilityCache;
}

/**
 * Вызов оркестратора. null = любой сбой (таймаут 6с, не-2xx, невалидный
 * ответ) — вызывающий уходит в офлайн-fallback.
 */
export async function fetchAssist(req: AssistRequest): Promise<AssistResult | null> {
  try {
    const res = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const parsed = assistResultSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
