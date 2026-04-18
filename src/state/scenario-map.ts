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
