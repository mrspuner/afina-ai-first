/**
 * Каталог контекстных подсказок промпт-бара (M6.4). На каждый тип тега —
 * 2-3 подсказки: короткая надпись (label, в чипе) + полный текст (fullText,
 * подставляется в инпут после тега).
 *
 * Покрыты типы тегов демо: Сигналы (signal) и Компании (sms/email/condition
 * как поля узлов кампаний). Ключ верхнего уровня — nodeType; вложенный —
 * имя параметра; `__node__` — подсказки для тега узла целиком.
 */

export interface SuggestionItem {
  /** Короткая ёмкая надпись для чипа. */
  label: string;
  /** Полный текст, подставляется в инпут после тега. */
  fullText: string;
}

const WHOLE_NODE_KEY = "__node__";

type ParamSuggestions = Record<string, SuggestionItem[]>;

export const SUGGESTION_CATALOG: Record<string, ParamSuggestions> = {
  sms: {
    "Текст": [
      { label: "Короче", fullText: "сделай текст короче, до 1 SMS-сегмента" },
      { label: "Дружелюбнее", fullText: "перепиши текст в более тёплом, дружелюбном тоне" },
      { label: "Добавить выгоду", fullText: "добавь в текст конкретную выгоду для клиента" },
    ],
    "Alpha-name": [
      { label: "Имя бренда", fullText: "поставь alpha-name с названием нашего бренда" },
      { label: "Короткое имя", fullText: "сделай alpha-name короче, до 11 символов" },
    ],
    "Время": [
      { label: "Утро буднего дня", fullText: "отправлять в 10:00 по будням" },
      { label: "Сразу", fullText: "отправлять сразу после входа в сегмент" },
    ],
    "Ссылка": [
      { label: "Короткая ссылка", fullText: "поставь сокращённую ссылку с UTM-метками" },
      { label: "На лендинг", fullText: "веди ссылку на посадочную страницу акции" },
    ],
    [WHOLE_NODE_KEY]: [
      { label: "Сделать лаконичнее", fullText: "сократи сообщение и убери лишние детали" },
      { label: "Усилить призыв", fullText: "усиль призыв к действию в конце сообщения" },
    ],
  },
  email: {
    "Тема": [
      { label: "Цепляющая тема", fullText: "сделай тему письма цепляющей, до 50 символов" },
      { label: "Без спам-слов", fullText: "перепиши тему без слов-триггеров спам-фильтров" },
    ],
    "Текст": [
      { label: "Короче", fullText: "сократи тело письма, оставь только суть" },
      { label: "Добавить структуру", fullText: "разбей текст письма на абзацы с подзаголовками" },
      { label: "Деловой тон", fullText: "перепиши письмо в более деловом тоне" },
    ],
    "Отправитель": [
      { label: "От имени бренда", fullText: "поставь отправителем имя нашего бренда" },
      { label: "Личное имя", fullText: "сделай отправителем имя конкретного менеджера" },
    ],
    [WHOLE_NODE_KEY]: [
      { label: "Повысить открываемость", fullText: "перепиши письмо так, чтобы повысить открываемость" },
      { label: "Сократить целиком", fullText: "сократи письмо целиком в полтора раза" },
    ],
  },
  signal: {
    [WHOLE_NODE_KEY]: [
      { label: "Сузить аудиторию", fullText: "сузь сегмент до самых горячих сигналов" },
      { label: "Расширить охват", fullText: "расширь сегмент, добавь средне-тёплые сигналы" },
      { label: "Свежие сигналы", fullText: "оставь только сигналы за последние 7 дней" },
    ],
  },
  condition: {
    "Триггер": [
      { label: "По открытию", fullText: "поставь условие: клиент открыл сообщение" },
      { label: "По клику", fullText: "поставь условие: клиент кликнул по ссылке" },
      { label: "Без доставки", fullText: "поставь условие: сообщение не доставлено" },
    ],
    [WHOLE_NODE_KEY]: [
      { label: "Ужесточить условие", fullText: "сделай условие ветвления строже" },
    ],
  },
};

/** Общий fallback — когда тип тега не покрыт каталогом. */
const GENERIC_SUGGESTIONS: SuggestionItem[] = [
  { label: "Сделать короче", fullText: "сделай текст короче и яснее" },
  { label: "Сменить тон", fullText: "перепиши в более дружелюбном тоне" },
  { label: "Добавить выгоду", fullText: "добавь конкретную выгоду для клиента" },
];

/**
 * Подсказки для тега: по nodeType + paramLabel. paramLabel undefined →
 * подсказки тега узла целиком. Неизвестный тип → generic-набор.
 */
export function getSuggestionsForTag(
  nodeType: string,
  paramLabel: string | undefined
): SuggestionItem[] {
  const byNode = SUGGESTION_CATALOG[nodeType];
  if (!byNode) return GENERIC_SUGGESTIONS;
  const key = paramLabel ?? WHOLE_NODE_KEY;
  return byNode[key] ?? byNode[WHOLE_NODE_KEY] ?? GENERIC_SUGGESTIONS;
}
