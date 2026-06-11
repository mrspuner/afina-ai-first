/**
 * POST /api/ai/assist — оркестратор: единая точка входа всех AI-запросов.
 * Модель выбирает инструмент из зарегистрированных; набор инструментов
 * фильтруется по context.screen (планы 005/006 расширяют набор).
 * Privacy: текст, история (≤8), сводка моковых данных. Не логировать тексты.
 */

import { google } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { z } from "zod";
import {
  assistRequestSchema,
  type AssistResult,
} from "@/lib/ai/assist-contract";
import {
  buildSystemPrompt,
  buildMessages,
} from "@/lib/ai/orchestrator-prompt";

export function GET() {
  return Response.json({
    available: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
  });
}

export async function POST(request: Request) {
  // Проверяем наличие ключа до разбора тела — быстрый путь к fallback
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json({ error: "no-key" }, { status: 503 });
  }

  // Разбираем тело запроса защитно
  let parsed;
  try {
    parsed = assistRequestSchema.safeParse(await request.json());
  } catch {
    return Response.json({ error: "invalid-json" }, { status: 400 });
  }
  if (!parsed.success) {
    return Response.json({ error: "invalid-request" }, { status: 400 });
  }
  const { text, history, context } = parsed.data;

  // Результат заполняет execute вызванного инструмента. Модель Gemini Flash
  // вызывает максимум один инструмент за ход; составные действия — план 006.
  let result: AssistResult = { kind: "none" };

  // Сигнатура tool() в ai@6 / @ai-sdk/provider-utils: поле схемы — inputSchema
  // (не parameters). toolChoice: "required" поддержан типом ToolChoice<TOOLS>.
  // execute может быть синхронным (возвращает OUTPUT напрямую).
  const tools = {
    answer: tool({
      description:
        "Ответить пользователю текстом: на вопрос по данным, по продукту, " +
        "или честно сказать, что не понял. Единственный способ говорить с пользователем.",
      inputSchema: z.object({
        text: z.string().describe("Ответ, 1–3 предложения, в голосе продукта"),
      }),
      execute: ({ text: answerText }) => {
        result = { kind: "answer", text: answerText };
        return "ok" as const;
      },
    }),
    clarify: tool({
      description:
        "Задать 1–2 уточняющих вопроса, когда запрос неоднозначен. " +
        "Только один раунд: если в истории уже есть твои вопросы — не вызывай повторно.",
      inputSchema: z.object({
        questions: z.array(z.string()).min(1).max(2),
      }),
      execute: ({ questions }) => {
        result = { kind: "clarify", questions };
        return "ok" as const;
      },
    }),
  };

  // "gemini-2.5-flash" — id актуальной Flash-модели на момент написания (2026-06-11)
  // Сверено с @ai-sdk/google@3.0.80
  const modelId = process.env.AFINA_AI_MODEL ?? "gemini-2.5-flash";

  try {
    await generateText({
      model: google(modelId),
      system: buildSystemPrompt(context),
      messages: buildMessages(history, text),
      tools,
      toolChoice: "required",
    });
    // Текст запроса и ответ модели не логируем — privacy-граница
    return Response.json(result, { status: 200 });
  } catch (err) {
    const s = String(err).toLowerCase();
    const rateLimited =
      s.includes("429") || s.includes("rate") || s.includes("quota");
    // Логируем только тип ошибки, без текста запроса
    console.error(
      "[ai/assist] LLM call failed:",
      rateLimited ? "rate-limited" : "ai-failed"
    );
    return Response.json(
      { error: rateLimited ? "rate-limited" : "ai-failed" },
      { status: 502 }
    );
  }
}
