import { z } from "zod";

/** Сообщение истории сессии (последние N из chat-context). */
export const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
});
export type HistoryMessage = z.infer<typeof historyMessageSchema>;

/** Контекст момента — собирает клиент, расширяется планами 005/006. */
export const assistContextSchema = z.object({
  screen: z.string(), // "section:Статистика" | "workflow" | "guided-signal:2" | ...
  dataSummary: z.string(), // компактный текст из data-summary.ts
});
export type AssistContext = z.infer<typeof assistContextSchema>;

export const assistRequestSchema = z.object({
  text: z.string().min(1),
  history: z.array(historyMessageSchema).max(8),
  context: assistContextSchema,
});
export type AssistRequest = z.infer<typeof assistRequestSchema>;

/** Результат: какой инструмент вызвала модель. Планы 005/006 добавляют kind'ы. */
export const assistResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("answer"), text: z.string() }),
  z.object({ kind: z.literal("clarify"), questions: z.array(z.string()).min(1).max(2) }),
  z.object({ kind: z.literal("none") }), // модель не вызвала инструмент
]);
export type AssistResult = z.infer<typeof assistResultSchema>;
