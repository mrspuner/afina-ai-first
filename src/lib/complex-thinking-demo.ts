// src/lib/complex-thinking-demo.ts

/**
 * Шаги chain-of-thoughts, которые проигрываются в drawer'е по hard-coded
 * сложным запросам. Каждый шаг — отдельный pending → resolve в чате;
 * финальное сообщение — короткий ответ модели.
 */
export interface ComplexThinkingStep {
  /** Текст, который "появляется" в pending пузыре. */
  reasoning: string;
  /** Сколько мс держать pending перед update_pending. */
  delayMs: number;
}

/**
 * Signal-section "сложный запрос" demo — exact-string match in non-Stats sections.
 */
export const COMPLEX_THINKING_STEPS_SIGNAL: ComplexThinkingStep[] = [
  { reasoning: "Анализирую запрос и доступные интересы…", delayMs: 600 },
  { reasoning: "Сравниваю текущие триггеры с целью кампании…", delayMs: 700 },
  { reasoning: "Определяю, нужно ли уточнить параметры или достаточно текущего контекста…", delayMs: 700 },
];

export const COMPLEX_THINKING_FINAL_REPLY_SIGNAL =
  "Я понял сложный запрос, поэтому задам дополнительный вопрос. Какие сегменты вы планируете включить — только горячие или ещё тёплые?";

/**
 * Statistics-section "сравни эффективность каналов" demo.
 * Triggered by stats-query-matcher when user is on the Statistics page.
 */
export const COMPLEX_THINKING_STEPS_STATS: ComplexThinkingStep[] = [
  {
    reasoning:
      "Запрос про сравнение эффективности каналов. Эффективность — неоднозначный термин.",
    delayMs: 700,
  },
  {
    reasoning:
      "Возможные интерпретации: конверсия (AR%), доход (Income), отношение Income/Expenses, отклик (Clicks/Sends).",
    delayMs: 900,
  },
  {
    reasoning:
      "Нужно уточнить у пользователя, какую метрику он имеет в виду.",
    delayMs: 700,
  },
];

export const COMPLEX_THINKING_FINAL_REPLY_STATS =
  "Я понял, что нужно сравнить каналы. Какую метрику использовать для оценки эффективности — конверсию, доход, ROI или отклик?";
