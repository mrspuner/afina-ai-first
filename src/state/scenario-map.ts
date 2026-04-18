// SCENARIO_TO_TYPE — used by the signal-creation wizard to build Signal
// objects from wizard output.
// TYPE_TO_SCENARIO — still used by the legacy workflow file-attachment paths
// in workflow-section.tsx and shell-bottom-bar.tsx. Will be removed in
// Block D when Canvas stores its own workflow graph per campaign.

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
