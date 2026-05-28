/**
 * Подсказки для шагов мастера guided-signal (1–8). Шаги 2, 5, 6 имеют
 * под-состояния — реестр выбирает набор по фактическому состоянию AppState.
 *
 * Шаги без под-состояния (1/3/4/7/8) отдают статический набор; step 1 покрывает
 * полный список из 6 сценариев продукта (см. PRODUCT.md / WAVE_1).
 */

import type { SuggestionItem, WizardSub } from "./types";

function ins(id: string, label: string, fullText: string): SuggestionItem {
  return { id, label, action: { kind: "insert-text", fullText } };
}

const STEP_1: SuggestionItem[] = [
  ins("wiz-1-reactivation", "Реактивация", "хочу сценарий реактивации спящих клиентов"),
  ins("wiz-1-retention", "Удержание", "хочу сценарий удержания клиентов"),
  ins("wiz-1-first-deal", "Первая сделка", "сценарий доведения нового клиента до первой покупки"),
  ins("wiz-1-upsell", "Апсейл", "хочу сценарий апсейла существующих клиентов"),
  ins("wiz-1-comeback", "Возврат", "сценарий возврата ушедших к конкурентам клиентов"),
  ins("wiz-1-registration", "Регистрация", "сценарий доведения до первого действия после регистрации"),
];

function step2(sub: { hasInterests: boolean; hasDomains: boolean }): SuggestionItem[] {
  // Пусто и интересов, и доменов — стартуем с подбора.
  if (!sub.hasInterests && !sub.hasDomains) {
    return [
      ins("wiz-2-fill-by-site", "Подобрать по сайту", "подбери интересы по сайту компании"),
      ins("wiz-2-template", "Из шаблона", "выбери готовый шаблон интересов"),
      ins("wiz-2-domain-first", "Начать с домена", "добавь сайт конкурента как триггер"),
    ];
  }

  // Есть и то, и другое — точечная подгонка.
  if (sub.hasInterests && sub.hasDomains) {
    return [
      ins("wiz-2-narrow", "Сузить набор", "оставь только самые релевантные интересы и домены"),
      ins("wiz-2-widen", "Расширить охват", "добавь смежные интересы для большего охвата"),
      ins("wiz-2-remix", "Перегенерировать", "перегенерируй набор интересов под мой сайт"),
    ];
  }

  // Есть интересы, но нет доменов — досыпаем триггеры.
  if (sub.hasInterests) {
    return [
      ins("wiz-2-add-domain", "Добавить домен", "добавь сайт конкурента как триггер"),
      ins("wiz-2-add-competitors", "Сайты конкурентов", "подбери список сайтов конкурентов"),
      ins("wiz-2-narrow2", "Сузить интересы", "оставь только самые релевантные интересы"),
    ];
  }

  // Есть домены, но нет интересов — досыпаем интересы.
  return [
    ins("wiz-2-add-interests", "Добавить интересы", "подбери интересы под мои триггеры"),
    ins("wiz-2-by-site2", "По сайту компании", "подбери интересы по сайту компании"),
    ins("wiz-2-template2", "Шаблон интересов", "выбери готовый шаблон интересов"),
  ];
}

const STEP_3: SuggestionItem[] = [
  ins("wiz-3-base-upload", "Загрузить базу", "хочу загрузить свою базу контактов"),
  ins("wiz-3-base-template", "Шаблон базы", "покажи шаблон файла с базой"),
  ins("wiz-3-base-format", "Какие форматы?", "какие форматы файлов вы принимаете"),
];

const STEP_4: SuggestionItem[] = [
  ins("wiz-4-volume-recommend", "Рекомендуемый объём", "поставь рекомендуемый объём аудитории"),
  ins("wiz-4-volume-max", "Максимум", "поставь максимально возможный объём"),
  ins("wiz-4-volume-test", "Тестовый объём", "сделай минимальный тестовый объём"),
];

const STEP_5_NEEDS_BUDGET_HELP: SuggestionItem[] = [
  {
    id: "wiz-5-budget-help",
    label: "Как рассчитывается рекомендуемый бюджет?",
    action: { kind: "dispatch", action: { type: "budget_help_shown" } },
  },
];

const STEP_5_AFTER_HELP: SuggestionItem[] = [
  ins("wiz-5-budget-recommend", "Рекомендуемая сумма", "поставь рекомендуемый бюджет"),
  ins("wiz-5-budget-conservative", "Поменьше", "уменьши бюджет, мне нужно осторожнее"),
  ins("wiz-5-budget-aggressive", "Побольше", "увеличь бюджет, хочу собрать максимум сигналов"),
];

function step6(sub: { nameSet: boolean }): SuggestionItem[] {
  if (sub.nameSet) {
    return [
      ins("wiz-6-rename", "Переименовать", "придумай другое название для этого сигнала"),
      ins("wiz-6-edit", "Изменить параметры", "хочу вернуться и поправить параметры"),
      ins("wiz-6-confirm", "Всё ок, далее", "всё подходит, переходим к запуску"),
    ];
  }
  return [
    ins("wiz-6-name", "Придумать название", "придумай ёмкое название для этого сигнала"),
    ins("wiz-6-edit2", "Изменить параметры", "хочу вернуться и поправить параметры"),
  ];
}

const STEP_7: SuggestionItem[] = [
  ins("wiz-7-launch-now", "Запустить сразу", "запусти сигнал прямо сейчас"),
  ins("wiz-7-launch-later", "Отложить запуск", "запланируй запуск на завтрашнее утро"),
  ins("wiz-7-launch-check", "Проверить ещё раз", "покажи итоговые параметры перед запуском"),
];

const STEP_8: SuggestionItem[] = [
  ins("wiz-8-next-campaign", "Создать кампанию", "создай кампанию на этом сигнале"),
  ins("wiz-8-next-signal", "Ещё один сигнал", "хочу создать ещё один сигнал"),
  ins("wiz-8-view-stats", "Открыть статистику", "открой статистику по этому сигналу"),
];

export function resolveWizardStep(s: WizardSub): SuggestionItem[] {
  switch (s.step) {
    case 1: return STEP_1;
    case 2: return step2({ hasInterests: s.hasInterests, hasDomains: s.hasDomains });
    case 3: return STEP_3;
    case 4: return STEP_4;
    case 5: return s.budgetHelpShown ? STEP_5_AFTER_HELP : STEP_5_NEEDS_BUDGET_HELP;
    case 6: return step6({ nameSet: s.nameSet });
    case 7: return STEP_7;
    case 8: return STEP_8;
  }
}
