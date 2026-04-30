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
