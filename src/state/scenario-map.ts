// SCENARIO_TO_TYPE — used by the signal-creation wizard to build Signal
// objects from wizard output. No other consumers remain.

import type { SignalType } from "./app-state";

export const SCENARIO_TO_TYPE: Record<string, SignalType> = {
  registration: "Регистрация",
  "first-deal": "Первая сделка",
  upsell: "Апсейл",
  retention: "Удержание",
  return: "Возврат",
  reactivation: "Реактивация",
};
