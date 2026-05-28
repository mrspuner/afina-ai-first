/**
 * Чистая логика выбора ветки Enter для промпт-бара (спека M5.5/M5.7).
 * Не зависит от React/DOM — тестируется юнит-тестом.
 */
export const APPLY_ALL_COMMAND = "Применить все изменения";

export interface EnterContext {
  hasActiveTag: boolean;
  activeTagFromQueue: boolean;
  activeText: string;
  queueLength: number;
}

export type EnterAction =
  | { kind: "apply-tag" }
  | { kind: "park-tag" }
  | { kind: "apply-all" }
  | { kind: "free-text" }
  | { kind: "noop" };

/** Решает, что делает Enter. Приоритет: тег > команда apply-all > свободный текст. */
export function decideEnterAction(ctx: EnterContext): EnterAction {
  const text = ctx.activeText.trim();
  if (ctx.hasActiveTag) {
    if (text.length === 0) return { kind: "noop" };
    // Парковка вместо немедленного применения, если тег поднят из очереди ЛИБО
    // в очереди уже есть черновики — тогда все правки копятся и применяются
    // вместе командой «Применить все изменения». Немедленный apply разрешён
    // только когда очередь пуста и тег свежий (ТЗ M5.7 + правка пользователя).
    if (ctx.activeTagFromQueue || ctx.queueLength > 0) return { kind: "park-tag" };
    return { kind: "apply-tag" };
  }
  if (text.toLowerCase() === APPLY_ALL_COMMAND.toLowerCase() && ctx.queueLength > 0) {
    return { kind: "apply-all" };
  }
  return { kind: "free-text" };
}
