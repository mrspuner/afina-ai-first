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
  /** Пользователь на странице «Статистика». */
  isStatistics: boolean;
}

export type SuggestionState =
  /** Общие welcome-подсказки (состояние 1, уже работает в проде). */
  | { kind: "welcome" }
  /** Контекстные подсказки активного тега (состояние 2). */
  | { kind: "context" }
  /** Подсказка «Применить все изменения» (состояние 3). */
  | { kind: "apply-all" }
  /** Чипы 3 зашитых stats-запросов (состояние 4). */
  | { kind: "stats" }
  /** Подсказки скрыты. */
  | { kind: "hidden" };

/**
 * Выбирает состояние зоны подсказок.
 * Приоритет:
 *  1. начал печатать после тега → hidden;
 *  2. активный тег → context;
 *  3. непустая очередь без тега → apply-all;
 *  4. welcome-экран → welcome;
 *  5. на странице Статистики → stats;
 *  6. иначе → hidden.
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
  if (input.isStatistics) {
    return { kind: "stats" };
  }
  return { kind: "hidden" };
}
