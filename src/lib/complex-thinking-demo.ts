// src/lib/complex-thinking-demo.ts

/**
 * Шаги chain-of-thoughts, которые проигрываются в drawer'е по запросу
 * "сложный запрос". Каждый шаг — отдельный pending → resolve в чате; финальное
 * сообщение — короткий ответ модели.
 */
export interface ComplexThinkingStep {
  /** Текст, который "появляется" в pending пузыре. */
  reasoning: string;
  /** Сколько мс держать pending перед update_pending. */
  delayMs: number;
}

export const COMPLEX_THINKING_STEPS: ComplexThinkingStep[] = [
  { reasoning: "Анализирую запрос и доступные интересы…", delayMs: 600 },
  { reasoning: "Сравниваю текущие триггеры с целью кампании…", delayMs: 700 },
  { reasoning: "Определяю, нужно ли уточнить параметры или достаточно текущего контекста…", delayMs: 700 },
];

export const COMPLEX_THINKING_FINAL_REPLY =
  "Я понял сложный запрос, поэтому задам дополнительный вопрос. Какие сегменты вы планируете включить — только горячие или ещё тёплые?";
