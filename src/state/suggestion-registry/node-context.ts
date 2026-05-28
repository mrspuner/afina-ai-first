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

function ins(id: string, label: string, fullText: string): SuggestionItem {
  return { id, label, action: { kind: "insert-text", fullText } };
}

const SMS: ParamSuggestions = {
  "Текст": [
    ins("sms-text-shorter", "Короче", "сделай текст короче, до 1 SMS-сегмента"),
    ins("sms-text-friendly", "Дружелюбнее", "перепиши текст в более тёплом, дружелюбном тоне"),
    ins("sms-text-benefit", "Добавить выгоду", "добавь в текст конкретную выгоду для клиента"),
  ],
  "Alpha-name": [
    ins("sms-alpha-brand", "Имя бренда", "поставь alpha-name с названием нашего бренда"),
    ins("sms-alpha-short", "Короткое имя", "сделай alpha-name короче, до 11 символов"),
  ],
  "Время": [
    ins("sms-time-morning", "Утро буднего дня", "отправлять в 10:00 по будням"),
    ins("sms-time-now", "Сразу", "отправлять сразу после входа в сегмент"),
  ],
  "Ссылка": [
    ins("sms-link-short", "Короткая ссылка", "поставь сокращённую ссылку с UTM-метками"),
    ins("sms-link-landing", "На лендинг", "веди ссылку на посадочную страницу акции"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("sms-node-laconic", "Сделать лаконичнее", "сократи сообщение и убери лишние детали"),
    ins("sms-node-cta", "Усилить призыв", "усиль призыв к действию в конце сообщения"),
  ],
};

const EMAIL: ParamSuggestions = {
  "Тема": [
    ins("email-subj-catchy", "Цепляющая тема", "сделай тему письма цепляющей, до 50 символов"),
    ins("email-subj-nospam", "Без спам-слов", "перепиши тему без слов-триггеров спам-фильтров"),
  ],
  "Текст": [
    ins("email-body-shorter", "Короче", "сократи тело письма, оставь только суть"),
    ins("email-body-struct", "Добавить структуру", "разбей текст письма на абзацы с подзаголовками"),
    ins("email-body-formal", "Деловой тон", "перепиши письмо в более деловом тоне"),
  ],
  "Отправитель": [
    ins("email-from-brand", "От имени бренда", "поставь отправителем имя нашего бренда"),
    ins("email-from-person", "Личное имя", "сделай отправителем имя конкретного менеджера"),
  ],
  "Ссылка": [
    ins("email-link-utm", "С UTM-метками", "добавь UTM-метки в ссылку для трекинга"),
    ins("email-link-landing", "На лендинг", "веди ссылку на посадочную страницу акции"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("email-node-openrate", "Повысить открываемость", "перепиши письмо так, чтобы повысить открываемость"),
    ins("email-node-compress", "Сократить целиком", "сократи письмо целиком в полтора раза"),
  ],
};

const PUSH: ParamSuggestions = {
  "Заголовок": [
    ins("push-title-short", "Короче", "сократи заголовок до 30 символов"),
    ins("push-title-cta", "С призывом", "перепиши заголовок с явным призывом к действию"),
  ],
  "Текст": [
    ins("push-body-shorter", "Короче", "сделай текст пуш-уведомления компактнее"),
    ins("push-body-emoji", "С эмодзи", "добавь подходящее эмодзи в начало текста"),
    ins("push-body-benefit", "Добавить выгоду", "добавь конкретную выгоду для клиента"),
  ],
  "Deeplink": [
    ins("push-deeplink-screen", "На нужный экран", "веди deeplink на профильный экран приложения"),
    ins("push-deeplink-utm", "С UTM-метками", "добавь UTM-метки в deeplink для трекинга"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("push-node-concise", "Сделать лаконичнее", "сократи пуш и убери лишние детали"),
    ins("push-node-urgency", "Добавить срочность", "добавь ощущение срочности — ограниченное время или количество"),
  ],
};

const IVR: ParamSuggestions = {
  "Сценарий": [
    ins("ivr-scenario-short", "Короче", "сократи сценарий звонка до главного"),
    ins("ivr-scenario-warm", "Теплее", "перепиши сценарий в более тёплом, человеческом тоне"),
  ],
  "Голос": [
    ins("ivr-voice-female", "Женский", "выбери женский голос"),
    ins("ivr-voice-male", "Мужской", "выбери мужской голос"),
    ins("ivr-voice-neutral", "Нейтральный", "выбери нейтральный голос"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("ivr-node-concise", "Сделать короче", "сократи общую длительность звонка"),
    ins("ivr-node-natural", "Естественнее", "сделай звонок естественнее, меньше шаблонных фраз"),
  ],
};

const WAIT: ParamSuggestions = {
  "Длительность": [
    ins("wait-dur-1h", "1 час", "поставь паузу 1 час"),
    ins("wait-dur-24h", "24 часа", "поставь паузу 24 часа"),
    ins("wait-dur-3d", "3 дня", "поставь паузу 3 дня"),
  ],
  "До события": [
    ins("wait-event-open", "До открытия", "ждать до открытия сообщения"),
    ins("wait-event-click", "До клика", "ждать до клика по ссылке"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("wait-node-shorter", "Сократить ожидание", "сделай паузу короче, чтобы быстрее догнать сегмент"),
    ins("wait-node-longer", "Удлинить ожидание", "увеличь паузу, чтобы дать клиенту больше времени"),
  ],
};

const CONDITION: ParamSuggestions = {
  "Триггер": [
    ins("cond-trigger-opened", "По открытию", "поставь условие: клиент открыл сообщение"),
    ins("cond-trigger-clicked", "По клику", "поставь условие: клиент кликнул по ссылке"),
    ins("cond-trigger-notdelivered", "Без доставки", "поставь условие: сообщение не доставлено"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("cond-node-strict", "Ужесточить условие", "сделай условие ветвления строже"),
    ins("cond-node-loose", "Ослабить условие", "сделай условие мягче, чтобы захватить больше клиентов"),
  ],
};

const SPLIT: ParamSuggestions = {
  "По": [
    ins("split-by-segment", "По сегменту", "разделяй по сегменту аудитории"),
    ins("split-by-random", "Случайно", "разделяй случайно для A/B-теста"),
  ],
  "Ветки": [
    ins("split-branches-2", "2 ветки", "сделай 2 равные ветки"),
    ins("split-branches-3", "3 ветки", "сделай 3 ветки"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("split-node-balance", "Уравновесить", "сделай ветки одинакового объёма"),
    ins("split-node-skew", "Сместить трафик", "пусти 80% трафика в первую ветку, 20% — во вторую"),
  ],
};

const SIGNAL: ParamSuggestions = {
  [WHOLE_NODE_KEY]: [
    ins("signal-node-narrow", "Сузить аудиторию", "сузь сегмент до самых горячих сигналов"),
    ins("signal-node-wide", "Расширить охват", "расширь сегмент, добавь средне-тёплые сигналы"),
    ins("signal-node-fresh", "Свежие сигналы", "оставь только сигналы за последние 7 дней"),
  ],
};

const SUCCESS: ParamSuggestions = {
  "Цель": [
    ins("success-goal-purchase", "Покупка", "цель — клиент совершил покупку"),
    ins("success-goal-form", "Заявка", "цель — клиент оставил заявку"),
    ins("success-goal-visit", "Визит", "цель — клиент посетил сайт"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("success-node-clarify", "Уточнить условие", "уточни, что именно считается успехом"),
  ],
};

const END: ParamSuggestions = {
  "Причина": [
    ins("end-reason-converted", "Сконвертирован", "причина — клиент сконвертирован"),
    ins("end-reason-unsub", "Отписка", "причина — клиент отписался"),
    ins("end-reason-timeout", "Таймаут", "причина — истёк срок сценария"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("end-node-clarify", "Указать причину", "добавь конкретную причину выхода из сценария"),
  ],
};

const STOREFRONT: ParamSuggestions = {
  "Офферы": [
    ins("storefront-offers-top", "Топ-офферы", "оставь в витрине только самые конверсионные офферы"),
    ins("storefront-offers-personal", "Под клиента", "подбери офферы под профиль клиента"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("storefront-node-refresh", "Обновить витрину", "перебери витрину под текущий сегмент"),
  ],
};

const LANDING: ParamSuggestions = {
  "CTA": [
    ins("landing-cta-strong", "Сильнее", "усиль call-to-action на лендинге"),
    ins("landing-cta-clear", "Прозрачнее", "сделай CTA однозначным, без вариантов толкования"),
  ],
  "Оффер": [
    ins("landing-offer-personal", "Под клиента", "сделай оффер под профиль клиента"),
    ins("landing-offer-benefit", "Подсветить выгоду", "вынеси главную выгоду в первый экран"),
  ],
  [WHOLE_NODE_KEY]: [
    ins("landing-node-clean", "Убрать лишнее", "убери с лендинга всё, что отвлекает от цели"),
  ],
};

const MERGE: ParamSuggestions = {
  [WHOLE_NODE_KEY]: [
    ins("merge-node-dedup", "Без дублей", "при слиянии убери дубли клиентов из веток"),
    ins("merge-node-priority", "С приоритетом", "при дубле сохрани клиента из ветки с большим весом"),
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
  ins("generic-shorter", "Сделать короче", "сделай текст короче и яснее"),
  ins("generic-tone", "Сменить тон", "перепиши в более дружелюбном тоне"),
  ins("generic-benefit", "Добавить выгоду", "добавь конкретную выгоду для клиента"),
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
