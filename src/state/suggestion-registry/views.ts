/**
 * Подсказки для переходных view'ов и ленты кампании.
 *
 * `campaign-feed` теперь ветвится по реальному `CampaignStatus` —
 * `draft`/`active`/`paused`/`completed`. У workflow без launched
 * → trustные draft-чипы; у campaign view используем фактический status
 * выбранной кампании.
 */

import type { CampaignStatus } from "@/state/app-state";
import type { SuggestionItem } from "./types";

function ask(id: string, label: string, prompt: string): SuggestionItem {
  return { id, label, action: { kind: "ask", prompt } };
}

const AWAITING_CAMPAIGN: SuggestionItem[] = [
  ask("view-await-campaign-from-signal", "Кампанию из сигнала", "создай кампанию на основе этого сигнала"),
  ask("view-await-campaign-template", "Из шаблона", "хочу выбрать шаблон кампании"),
  ask("view-await-campaign-skip", "Пока без кампании", "сохрани сигнал, кампанию настрою позже"),
];

const CAMPAIGN_SELECT: SuggestionItem[] = [
  ask("view-camp-select-recent", "Последние", "покажи самые свежие сигналы"),
  ask("view-camp-select-hot", "Только горячие", "оставь только самые горячие сигналы"),
  ask("view-camp-select-new", "Создать новый", "создай новый сигнал с нуля"),
];

const FEED_DRAFT: SuggestionItem[] = [
  ask("view-feed-draft-launch", "Запустить", "запусти эту кампанию"),
  ask("view-feed-draft-edit", "Изменить сценарий", "хочу поправить сценарий кампании"),
  ask("view-feed-draft-schedule", "Запланировать", "запланируй запуск на завтра"),
];

const FEED_ACTIVE: SuggestionItem[] = [
  ask("view-feed-active-stats", "Открыть статистику", "покажи статистику этой кампании"),
  ask("view-feed-active-pause", "Поставить на паузу", "поставь кампанию на паузу"),
  ask("view-feed-active-edit", "Доправить сценарий", "хочу поправить сценарий по ходу"),
];

const FEED_PAUSED: SuggestionItem[] = [
  ask("view-feed-paused-resume", "Возобновить", "возобнови кампанию"),
  ask("view-feed-paused-complete", "Завершить", "заверши эту кампанию"),
  ask("view-feed-paused-stats", "Что произошло?", "покажи, почему я поставил кампанию на паузу"),
];

const FEED_COMPLETED: SuggestionItem[] = [
  ask("view-feed-done-duplicate", "Запустить копию", "создай копию этой кампании и запусти"),
  ask("view-feed-done-analysis", "Анализ результата", "разбери, что в кампании сработало, а что нет"),
  ask("view-feed-done-export", "Выгрузить отчёт", "выгрузи итоговый отчёт по кампании"),
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
    case "active": return FEED_ACTIVE;
    case "paused": return FEED_PAUSED;
    case "completed": return FEED_COMPLETED;
  }
}
