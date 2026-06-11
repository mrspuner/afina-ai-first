import { z } from "zod";
import type { StatisticsFilters } from "@/sections/statistics/statistics-state";

export const rowKindSchema = z.enum([
  "days",
  "weekdays",
  "weeks",
  "months",
  "offers",
  "subscribers",
  "channels",
  "creatives",
  "triggers",
  "landings",
  "campaigns",
  "scenarios",
  "strategies",
  "advertisers",
  "traffic-suppliers",
]);

export const sortColumnSchema = z.enum([
  "approves",
  "expenses",
  "income",
  "holds",
  "rejects",
  "clicks",
  "sends",
  "actions",
  "ar",
  "rr",
  "label",
]);

export const periodSchema = z.object({
  preset: z.enum([
    "today",
    "yesterday",
    "this-quarter",
    "last-quarter",
    "this-month",
    "last-month",
    "this-year",
    "last-year",
    "custom",
  ]),
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * Подмножество StatisticsFilters, которым управляет AI.
 * calcMethod/currency/conditions/columns сознательно не отдаём — ими управляют ручные контролы.
 *
 * ВНИМАНИЕ: sort не использует z.union с null (Gemini ломает union в function-calling tools).
 * Вместо этого — поле sort для установки сортировки и clearSort для сброса.
 */
export const statsPatchSchema = z.object({
  rows: rowKindSchema.optional(),
  subRows: z.union([rowKindSchema, z.literal("none")]).optional(),
  rowCount: z.number().int().min(1).max(100).optional(),
  sort: z
    .object({
      column: sortColumnSchema,
      direction: z.enum(["asc", "desc"]),
    })
    .optional(),
  clearSort: z.boolean().optional().describe("Сбросить сортировку"),
  period: periodSchema.optional(),
});
export type StatsPatch = z.infer<typeof statsPatchSchema>;

/**
 * Маппит StatsPatch (wire-форма) в Partial<StatisticsFilters>:
 * - clearSort:true → sort:null
 * - sort (если есть) → sort объект
 * - остальные поля копируются напрямую
 */
export function toFiltersPatch(p: StatsPatch): Partial<StatisticsFilters> {
  const result: Partial<StatisticsFilters> = {};

  if (p.rows !== undefined) result.rows = p.rows;
  if (p.subRows !== undefined) result.subRows = p.subRows;
  if (p.rowCount !== undefined) result.rowCount = p.rowCount;
  if (p.period !== undefined) result.period = p.period;

  if (p.clearSort) {
    result.sort = null;
  } else if (p.sort !== undefined) {
    result.sort = p.sort;
  }

  return result;
}

// Совместимость на уровне типов: результат toFiltersPatch присваим в Partial<StatisticsFilters>.
const _check: Partial<StatisticsFilters> = toFiltersPatch({});
void _check;
