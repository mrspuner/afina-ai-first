/**
 * Подсказки для переходных view'ов и ленты кампании.
 *
 * `campaign-feed` теперь ветвится по реальному `CampaignStatus` —
 * `draft`/`scheduled`/`active`/`paused`/`completed`. У workflow без launched
 * → trustные draft-чипы; у campaign view используем фактический status
 * выбранной кампании.
 */

import type { CampaignStatus } from "@/state/app-state";
import type { SuggestionItem } from "./types";

function ins(id: string, label: string, fullText: string): SuggestionItem {
  return { id, label, action: { kind: "insert-text", fullText } };
}

const AWAITING_CAMPAIGN: SuggestionItem[] = [
  ins("view-await-campaign-from-signal", "Кампанию из сигнала", "создай кампанию на основе этого сигнала"),
  ins("view-await-campaign-template", "Из шаблона", "хочу выбрать шаблон кампании"),
  ins("view-await-campaign-skip", "Пока без кампании", "сохрани сигнал, кампанию настрою позже"),
];

const CAMPAIGN_SELECT: SuggestionItem[] = [
  ins("view-camp-select-recent", "Последние", "покажи самые свежие сигналы"),
  ins("view-camp-select-hot", "Только горячие", "оставь только самые горячие сигналы"),
  ins("view-camp-select-new", "Создать новый", "создай новый сигнал с нуля"),
];

const FEED_DRAFT: SuggestionItem[] = [
  ins("view-feed-draft-launch", "Запустить", "запусти эту кампанию"),
  ins("view-feed-draft-edit", "Изменить сценарий", "хочу поправить сценарий кампании"),
  ins("view-feed-draft-schedule", "Запланировать", "запланируй запуск на завтра"),
];

const FEED_SCHEDULED: SuggestionItem[] = [
  ins("view-feed-sched-launch-now", "Запустить сейчас", "запусти кампанию прямо сейчас, не жди расписание"),
  ins("view-feed-sched-cancel", "Отменить расписание", "отмени запланированный запуск"),
  ins("view-feed-sched-reschedule", "Перенести запуск", "перенеси запуск на другое время"),
];

const FEED_ACTIVE: SuggestionItem[] = [
  ins("view-feed-active-stats", "Открыть статистику", "покажи статистику этой кампании"),
  ins("view-feed-active-pause", "Поставить на паузу", "поставь кампанию на паузу"),
  ins("view-feed-active-edit", "Доправить сценарий", "хочу поправить сценарий по ходу"),
];

const FEED_PAUSED: SuggestionItem[] = [
  ins("view-feed-paused-resume", "Возобновить", "возобнови кампанию"),
  ins("view-feed-paused-complete", "Завершить", "заверши эту кампанию"),
  ins("view-feed-paused-stats", "Что произошло?", "покажи, почему я поставил кампанию на паузу"),
];

const FEED_COMPLETED: SuggestionItem[] = [
  ins("view-feed-done-duplicate", "Запустить копию", "создай копию этой кампании и запусти"),
  ins("view-feed-done-analysis", "Анализ результата", "разбери, что в кампании сработало, а что нет"),
  ins("view-feed-done-export", "Выгрузить отчёт", "выгрузи итоговый отчёт по кампании"),
];

export function resolveAwaitingCampaign(): SuggestionItem[] {
  return AWAITING_CAMPAIGN;
}

export function resolveCampaignSelect(): SuggestionItem[] {
  return CAMPAIGN_SELECT;
}

export function resolveCampaignFeed(status: CampaignStatus): SuggestionItem[] {
  switch (status) {
    case "draft": return FEED_DRAFT;
    case "scheduled": return FEED_SCHEDULED;
    case "active": return FEED_ACTIVE;
    case "paused": return FEED_PAUSED;
    case "completed": return FEED_COMPLETED;
  }
}
