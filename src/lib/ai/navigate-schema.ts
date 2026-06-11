import { z } from "zod";

/**
 * Цель навигации — плоская форма (Gemini ломает discriminated unions в tools,
 * см. ops-wire-schema.ts). kind определяет, какое из полей обязательно;
 * toNavigateTarget собирает строгую цель.
 */
export const wireNavigateSchema = z.object({
  kind: z.enum(["section", "campaign-workflow", "signal"]),
  section: z
    .enum(["Статистика", "Сигналы", "Кампании", "Настройки"])
    .optional()
    .describe("Для kind=section"),
  campaignId: z
    .string()
    .optional()
    .describe("Для kind=campaign-workflow: id из данных аккаунта"),
  signalId: z
    .string()
    .optional()
    .describe("Для kind=signal: id из данных аккаунта"),
});
export type WireNavigate = z.infer<typeof wireNavigateSchema>;

export type NavigateTarget =
  | { kind: "section"; name: "Статистика" | "Сигналы" | "Кампании" | "Настройки" }
  | { kind: "campaign-workflow"; campaignId: string }
  | { kind: "signal"; signalId: string };

/**
 * Маппит плоскую wire-форму в строгую NavigateTarget.
 * Возвращает null, если обязательное поле для данного kind отсутствует.
 */
export function toNavigateTarget(w: WireNavigate): NavigateTarget | null {
  if (w.kind === "section") {
    return w.section ? { kind: "section", name: w.section } : null;
  }
  if (w.kind === "campaign-workflow") {
    return w.campaignId ? { kind: "campaign-workflow", campaignId: w.campaignId } : null;
  }
  // signal
  return w.signalId ? { kind: "signal", signalId: w.signalId } : null;
}
