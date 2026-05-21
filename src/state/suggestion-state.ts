/**
 * Чистая логика выбора состояния зоны подсказок под промпт-баром (M6.1/M6.2).
 * Не зависит от React/DOM.
 */

export interface SuggestionStateInput {
  /** В инпуте есть активный тег. */
  hasActiveTag: boolean;
  /** После тега уже напечатан какой-то текст. */
  activeTagTypedText: boolean;
  /** Сколько черновиков в очереди. */
  queueLength: number;
  /** Текущий экран — welcome (общие подсказки доступны). */
  isWelcome: boolean;
}

export type SuggestionState =
  /** Общие welcome-подсказки (состояние 1, уже работает в проде). */
  | { kind: "welcome" }
  /** Контекстные подсказки активного тега (состояние 2). */
  | { kind: "context" }
  /** Подсказка «Применить все изменения» (состояние 3). */
  | { kind: "apply-all" }
  /** Подсказки скрыты. */
  | { kind: "hidden" };

/**
 * Выбирает состояние зоны подсказок.
 * Приоритет (спека M6.1):
 *  1. начал печатать после тега → hidden (всё скрыто);
 *  2. активный тег → context (тег выигрывает у apply-all);
 *  3. непустая очередь без тега → apply-all;
 *  4. welcome-экран → welcome;
 *  5. иначе → hidden.
 */
export function selectSuggestionState(
  input: SuggestionStateInput
): SuggestionState {
  if (input.hasActiveTag && input.activeTagTypedText) {
    return { kind: "hidden" };
  }
  if (input.hasActiveTag) {
    return { kind: "context" };
  }
  if (input.queueLength > 0) {
    return { kind: "apply-all" };
  }
  if (input.isWelcome) {
    return { kind: "welcome" };
  }
  return { kind: "hidden" };
}
