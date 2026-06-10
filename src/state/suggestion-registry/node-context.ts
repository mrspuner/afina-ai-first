/**
 * Контекстные подсказки активного тега узла workflow. Индексация:
 * `nodeType` → `paramLabel | "__node__"` → массив `SuggestionItem`.
 *
 * Покрывает все актуальные `WorkflowNodeType` (signal, success, end, split,
 * wait, condition, merge, sms, email, push, ivr, storefront, landing).
 * Legacy-типы (`default`, `channel`, `retarget`, `result`, `new`) попадают в
 * GENERIC-fallback.
 */

import type { WorkflowNodeType } from "@/types/workflow";
import type { SuggestionItem } from "./types";

const WHOLE_NODE_KEY = "__node__";

type ParamSuggestions = Record<string, SuggestionItem[]>;

function ask(id: string, label: string, prompt: string): SuggestionItem {
  return { id, label, action: { kind: "ask", prompt } };
}

const SMS: ParamSuggestions = {
  "Текст": [
    ask("sms-text-shorter", "Короче", "сделай текст короче, до 1 SMS-сегмента"),
    ask("sms-text-friendly", "Дружелюбнее", "перепиши текст в более тёплом, дружелюбном тоне"),
    ask("sms-text-benefit", "Добавить выгоду", "добавь в текст конкретную выгоду для клиента"),
  ],
  "Alpha-name": [
    ask("sms-alpha-brand", "Имя бренда", "поставь alpha-name с названием нашего бренда"),
    ask("sms-alpha-short", "Короткое имя", "сделай alpha-name короче, до 11 символов"),
  ],
  "Время": [
    ask("sms-time-morning", "Утро буднего дня", "отправлять в 10:00 по будням"),
    ask("sms-time-now", "Сразу", "отправлять сразу после входа в сегмент"),
  ],
  "Ссылка": [
    ask("sms-link-short", "Короткая ссылка", "поставь сокращённую ссылку с UTM-метками"),
    ask("sms-link-landing", "На лендинг", "веди ссылку на посадочную страницу акции"),
  ],
  [WHOLE_NODE_KEY]: [
    ask("sms-node-laconic", "Сделать лаконичнее", "сократи сообщение и убери лишние детали"),
    ask("sms-node-cta", "Усилить призыв", "усиль призыв к действию в конце сообщения"),
  ],
};

const EMAIL: ParamSuggestions = {
  "Тема": [
    ask("email-subj-catchy", "Цепляющая тема", "сделай тему письма цепляющей, до 50 символов"),
    ask("email-subj-nospam", "Без спам-слов", "перепиши тему без слов-триггеров спам-фильтров"),
  ],
  "Текст": [
    ask("email-body-shorter", "Короче", "сократи тело письма, оставь только суть"),
    ask("email-body-struct", "Добавить структуру", "разбей текст письма на абзацы с подзаголовками"),
    ask("email-body-formal", "Деловой тон", "перепиши письмо в более деловом тоне"),
  ],
  "Отправитель": [
    ask("email-from-brand", "От имени бренда", "поставь отправителем имя нашего бренда"),
    ask("email-from-person", "Личное имя", "сделай отправителем имя конкретного менеджера"),
  ],
  "Ссылка": [
    ask("email-link-utm", "С UTM-метками", "добавь UTM-метки в ссылку для трекинга"),
    ask("email-link-landing", "На лендинг", "веди ссылку на посадочную страницу акции"),
  ],
  [WHOLE_NODE_KEY]: [
    ask("email-node-openrate", "Повысить открываемость", "перепиши письмо так, чтобы повысить открываемость"),
    ask("email-node-compress", "Сократить целиком", "сократи письмо целиком в полтора раза"),
  ],
};

const PUSH: ParamSuggestions = {
  "Заголовок": [
    ask("push-title-short", "Короче", "сократи заголовок до 30 символов"),
    ask("push-title-cta", "С призывом", "перепиши заголовок с явным призывом к действию"),
  ],
  "Текст": [
    ask("push-body-shorter", "Короче", "сделай текст пуш-уведомления компактнее"),
    ask("push-body-emoji", "С эмодзи", "добавь подходящее эмодзи в начало текста"),
    ask("push-body-benefit", "Добавить выгоду", "добавь конкретную выгоду для клиента"),
  ],
  "Deeplink": [
    ask("push-deeplink-screen", "На нужный экран", "веди deeplink на профильный экран приложения"),
    ask("push-deeplink-utm", "С UTM-метками", "добавь UTM-метки в deeplink для трекинга"),
  ],
  [WHOLE_NODE_KEY]: [
    ask("push-node-concise", "Сделать лаконичнее", "сократи пуш и убери лишние детали"),
    ask("push-node-urgency", "Добавить срочность", "добавь ощущение срочности — ограниченное время или количество"),
  ],
};

const IVR: ParamSuggestions = {
  "Сценарий": [
    ask("ivr-scenario-short", "Короче", "сократи сценарий звонка до главного"),
    ask("ivr-scenario-warm", "Теплее", "перепиши сценарий в более тёплом, человеческом тоне"),
  ],
  "Голос": [
    ask("ivr-voice-female", "Женский", "выбери женский голос"),
    ask("ivr-voice-male", "Мужской", "выбери мужской голос"),
    ask("ivr-voice-neutral", "Нейтральный", "выбери нейтральный голос"),
  ],
  [WHOLE_NODE_KEY]: [
    ask("ivr-node-concise", "Сделать короче", "сократи общую длительность звонка"),
    ask("ivr-node-natural", "Естественнее", "сделай звонок естественнее, меньше шаблонных фраз"),
  ],
};

const WAIT: ParamSuggestions = {
  "Длительность": [
    ask("wait-dur-1h", "1 час", "поставь паузу 1 час"),
    ask("wait-dur-24h", "24 часа", "поставь паузу 24 часа"),
    ask("wait-dur-3d", "3 дня", "поставь паузу 3 дня"),
  ],
  "До события": [
    ask("wait-event-open", "До открытия", "ждать до открытия сообщения"),
    ask("wait-event-click", "До клика", "ждать до клика по ссылке"),
  ],
  [WHOLE_NODE_KEY]: [
    ask("wait-node-shorter", "Сократить ожидание", "сделай паузу короче, чтобы быстрее догнать сегмент"),
    ask("wait-node-longer", "Удлинить ожидание", "увеличь паузу, чтобы дать клиенту больше времени"),
  ],
};

const CONDITION: ParamSuggestions = {
  "Триггер": [
    ask("cond-trigger-opened", "По открытию", "поставь условие: клиент открыл сообщение"),
    ask("cond-trigger-clicked", "По клику", "поставь условие: клиент кликнул по ссылке"),
    ask("cond-trigger-notdelivered", "Без доставки", "поставь условие: сообщение не доставлено"),
  ],
  [WHOLE_NODE_KEY]: [
    ask("cond-node-strict", "Ужесточить условие", "сделай условие ветвления строже"),
    ask("cond-node-loose", "Ослабить условие", "сделай условие мягче, чтобы захватить больше клиентов"),
  ],
};

const SPLIT: ParamSuggestions = {
  "По": [
    ask("split-by-equal", "Поровну", "разделяй аудиторию поровну на равные ветки"),
    ask("split-by-segment", "По сегменту", "разделяй по сегменту аудитории"),
    ask("split-by-random", "Случайно", "разделяй случайно для A/B-теста"),
  ],
  "Ветки": [
    ask("split-branches-2", "2 ветки", "сделай 2 равные ветки"),
    ask("split-branches-3", "3 ветки", "сделай 3 ветки"),
  ],
  [WHOLE_NODE_KEY]: [
    // Первая выделенная подсказка — объясняет, как работает разделение (A6).
    {
      id: "split-how-it-works",
      label: "Как работает разделение",
      action: { kind: "ask", prompt: "как работает разделение" },
      variant: "brand",
    },
    ask("split-node-balance", "Уравновесить", "сделай ветки одинакового объёма"),
    ask("split-node-skew", "Сместить трафик", "пусти 80% трафика в первую ветку, 20% — во вторую"),
  ],
};

const SIGNAL: ParamSuggestions = {
  [WHOLE_NODE_KEY]: [
    ask("signal-node-narrow", "Сузить аудиторию", "сузь сегмент до самых горячих сигналов"),
    ask("signal-node-wide", "Расширить охват", "расширь сегмент, добавь средне-тёплые сигналы"),
    ask("signal-node-fresh", "Свежие сигналы", "оставь только сигналы за последние 7 дней"),
  ],
};

const SUCCESS: ParamSuggestions = {
  "Цель": [
    ask("success-goal-purchase", "Покупка", "цель — клиент совершил покупку"),
    ask("success-goal-form", "Заявка", "цель — клиент оставил заявку"),
    ask("success-goal-visit", "Визит", "цель — клиент посетил сайт"),
  ],
  [WHOLE_NODE_KEY]: [
    ask("success-node-clarify", "Уточнить условие", "уточни, что именно считается успехом"),
  ],
};

const END: ParamSuggestions = {
  "Причина": [
    ask("end-reason-converted", "Сконвертирован", "причина — клиент сконвертирован"),
    ask("end-reason-unsub", "Отписка", "причина — клиент отписался"),
    ask("end-reason-timeout", "Таймаут", "причина — истёк срок сценария"),
  ],
  [WHOLE_NODE_KEY]: [
    ask("end-node-clarify", "Указать причину", "добавь конкретную причину выхода из сценария"),
  ],
};

const STOREFRONT: ParamSuggestions = {
  "Офферы": [
    ask("storefront-offers-top", "Топ-офферы", "оставь в витрине только самые конверсионные офферы"),
    ask("storefront-offers-personal", "Под клиента", "подбери офферы под профиль клиента"),
  ],
  [WHOLE_NODE_KEY]: [
    ask("storefront-node-refresh", "Обновить витрину", "перебери витрину под текущий сегмент"),
  ],
};

const LANDING: ParamSuggestions = {
  "CTA": [
    ask("landing-cta-strong", "Сильнее", "усиль call-to-action на лендинге"),
    ask("landing-cta-clear", "Прозрачнее", "сделай CTA однозначным, без вариантов толкования"),
  ],
  "Оффер": [
    ask("landing-offer-personal", "Под клиента", "сделай оффер под профиль клиента"),
    ask("landing-offer-benefit", "Подсветить выгоду", "вынеси главную выгоду в первый экран"),
  ],
  [WHOLE_NODE_KEY]: [
    ask("landing-node-clean", "Убрать лишнее", "убери с лендинга всё, что отвлекает от цели"),
  ],
};

const MERGE: ParamSuggestions = {
  [WHOLE_NODE_KEY]: [
    ask("merge-node-dedup", "Без дублей", "при слиянии убери дубли клиентов из веток"),
    ask("merge-node-priority", "С приоритетом", "при дубле сохрани клиента из ветки с большим весом"),
  ],
};

const CATALOG: Partial<Record<WorkflowNodeType, ParamSuggestions>> = {
  sms: SMS,
  email: EMAIL,
  push: PUSH,
  ivr: IVR,
  wait: WAIT,
  condition: CONDITION,
  split: SPLIT,
  signal: SIGNAL,
  success: SUCCESS,
  end: END,
  storefront: STOREFRONT,
  landing: LANDING,
  merge: MERGE,
};

const GENERIC: SuggestionItem[] = [
  ask("generic-shorter", "Сделать короче", "сделай текст короче и яснее"),
  ask("generic-tone", "Сменить тон", "перепиши в более дружелюбном тоне"),
  ask("generic-benefit", "Добавить выгоду", "добавь конкретную выгоду для клиента"),
];

/**
 * Подсказки для тега: по `nodeType` + `paramLabel`. `paramLabel` undefined →
 * подсказки тега узла целиком. Неизвестный `nodeType` или известный +
 * неизвестный `paramLabel` → fallback на whole-node, затем на GENERIC.
 */
export function resolveNodeContext(
  nodeType: WorkflowNodeType,
  paramLabel: string | undefined
): SuggestionItem[] {
  const byNode = CATALOG[nodeType];
  if (!byNode) return GENERIC;
  const key = paramLabel ?? WHOLE_NODE_KEY;
  return byNode[key] ?? byNode[WHOLE_NODE_KEY] ?? GENERIC;
}
