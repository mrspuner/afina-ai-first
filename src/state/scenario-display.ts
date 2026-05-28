import { SCENARIOS } from "@/data/scenarios";
import type { Signal } from "./app-state";
import { SCENARIO_NAMES } from "@/sections/signals/signal-summary-data";

/**
 * Human scenario name for a signal. Prefers the explicit scenario id captured
 * in the wizard; otherwise falls back to the base scenario whose signalType
 * matches; finally falls back to the raw type string.
 */
export function scenarioNameForSignal(signal: Signal): string {
  const id = signal.wizardData?.scenario ?? null;
  if (id && SCENARIO_NAMES[id]) return SCENARIO_NAMES[id];
  const base = SCENARIOS.find((s) => s.isBase && s.signalType === signal.type);
  return base?.name ?? signal.type;
}

/** Generic campaign name in the «Сценарий №N» format. */
export function defaultCampaignName(scenarioName: string, n: number): string {
  return `${scenarioName} №${n}`;
}
