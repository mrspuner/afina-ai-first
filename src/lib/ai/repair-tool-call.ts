/**
 * Чинит DeepSeek-quirk: некоторые модели сериализуют вложенные object/array
 * аргументы инструмента как JSON-строку (напр. navigate.target приходит строкой
 * "{\"kind\":\"section\",...}"), из-за чего валидация tool-input падает до execute.
 *
 * unstringifyJsonArgs парсит исходный JSON аргументов и для каждого строкового
 * поля, похожего на JSON-объект/массив, заменяет его распарсенным значением.
 * Возвращает новую JSON-строку или null, если чинить нечего (тогда исходная
 * ошибка остаётся). Чистая функция — используется из experimental_repairToolCall.
 */
export function unstringifyJsonArgs(inputJson: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(inputJson);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  let changed = false;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== "string") continue;
    const t = value.trim();
    const looksJson =
      (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
    if (!looksJson) continue;
    try {
      obj[key] = JSON.parse(t);
      changed = true;
    } catch {
      // оставляем строку как есть
    }
  }
  return changed ? JSON.stringify(obj) : null;
}
