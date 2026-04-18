// SCENARIO_TO_TYPE stays — used by the signal-creation wizard to build Signal
// objects from wizard output. TYPE_TO_SCENARIO is adapter code (Block A.5):
// it maps new SignalType back to old scenarioId strings for views that still
// expect scenarioId. Removed in Block B when those views are rewritten.

import type { SignalType } from "./app-state";

export const SCENARIO_TO_TYPE: Record<string, SignalType> = {
  registration: "Регистрация",
  "first-deal": "Первая сделка",
  upsell: "Апсейл",
  retention: "Удержание",
  return: "Возврат",
  reactivation: "Реактивация",
};

export const TYPE_TO_SCENARIO: Record<SignalType, string> = {
  "Регистрация": "registration",
  "Первая сделка": "first-deal",
  "Апсейл": "upsell",
  "Удержание": "retention",
  "Возврат": "return",
  "Реактивация": "reactivation",
};
