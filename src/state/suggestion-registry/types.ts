/**
 * Единый справочник чипов-подсказок под PromptBar.
 *
 * Структуры данных:
 * - {@link SuggestionAction} — что делает клик по чипу (5 видов).
 * - {@link SuggestionItem} — один чип в любом scope.
 * - {@link Scope} — ось индексации: где сейчас находится пользователь
 *   (раздел/состояние/выбранный узел).
 */

import type { Action as AppAction, CampaignStatus } from "@/state/app-state";
import type { WorkflowNodeType } from "@/types/workflow";
import type { Chip as WelcomeChip } from "@/sections/welcome/onboarding-chat";
import type { SignalStatus } from "@/types/signal-status";
import type { PeriodPreset, RowKind } from "@/sections/statistics/statistics-state";
import type { CampaignSort } from "@/state/parse-campaign-filter";

/** Дискриминированное действие чипа. */
export type SuggestionAction =
  | { kind: "insert-text"; fullText: string }
  | { kind: "submit"; phrase: string }
  | { kind: "dispatch"; action: AppAction }
  | { kind: "chat-submit"; chip: WelcomeChip }
  | { kind: "command"; command: "apply-all" };

export interface SuggestionItem {
  /** Стабильный ключ для React и тестов. Уникален внутри одного scope. */
  id: string;
  /** Короткая надпись чипа. */
  label: string;
  /** Что произойдёт по клику. */
  action: SuggestionAction;
  /** Визуальный вариант: `brand` — жёлтый акцент (apply-all). */
  variant?: "default" | "brand";
}

export type CampaignsSub = {
  kind: "campaigns";
  hasCampaigns: boolean;
  /** Активные status-фильтры — уже выбранные значения исключаются из чипов. */
  activeFilter: readonly CampaignStatus[];
  /** Активная сортировка — `default` означает «сортировка не выбрана». */
  sort: CampaignSort;
};

export type StatisticsSub = {
  kind: "statistics";
  /** Текущий пресет периода — влияет на «Сравни с прошлым …». */
  period: PeriodPreset;
  /** Текущая группировка строк — определяет, что считается «по чему». */
  rowKind: RowKind;
};

export type SignalsSub = {
  kind: "signals";
  /** Сколько каких статусов сейчас в `state.signals` — реестр приоритезирует. */
  statusCounts: Readonly<Record<SignalStatus, number>>;
};

export type SettingsSub = {
  kind: "settings";
  /** Подключены ли интеграции (по любому признаку — domains/regions/etc). */
  hasIntegrations: boolean;
  /** Текущий тариф базовый (можно предлагать апгрейд). */
  isBasicTariff: boolean;
};

export type SectionSub = CampaignsSub | StatisticsSub | SignalsSub | SettingsSub;

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Под-состояния шагов wizard'а, к которым реестр реагирует:
 * - step 2: интересы и домены могут быть пустыми/заполненными, можно ремикснуть;
 * - step 5: уже знакомый budgetHelpShown;
 * - step 6: имя сигнала введено или нет.
 */
export type WizardSub =
  | { step: 1 }
  | { step: 2; hasInterests: boolean; hasDomains: boolean }
  | { step: 3 }
  | { step: 4 }
  | { step: 5; budgetHelpShown: boolean }
  | { step: 6; nameSet: boolean }
  | { step: 7 }
  | { step: 8 };

/**
 * Текущее «место» пользователя — ось, по которой реестр индексирует чипы.
 * Селектор {@link selectPromptSuggestions} строит scope из AppState и контекста
 * PromptBar; реестр ({@link resolveSuggestions}) отдаёт массив `SuggestionItem`.
 */
export type Scope =
  | { kind: "node-context"; nodeType: WorkflowNodeType; paramLabel?: string }
  | { kind: "draft-queue" }
  | { kind: "welcome-wave"; chips: readonly WelcomeChip[] }
  | { kind: "section"; sub: SectionSub }
  | { kind: "wizard-step"; sub: WizardSub }
  | { kind: "awaiting-campaign" }
  | { kind: "campaign-select" }
  /**
   * Лента кампании. Различаем по `CampaignStatus`:
   * - `draft` → draft-чипы (запустить/изменить/запланировать);
   * - `scheduled` → отменить расписание / запустить сейчас;
   * - `active` → пауза / открыть статистику;
   * - `paused` → возобновить / завершить;
   * - `completed` → запустить копию / анализ.
   */
  | { kind: "campaign-feed"; status: CampaignStatus };
