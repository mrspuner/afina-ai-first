// SCENARIO_TO_TYPE — used by the signal-creation wizard to build Signal
// objects from wizard output. Derived from the scenarios library so every
// scenario id (base, curated, catalog) maps to a SignalType under the hood.

import type { SignalType } from "./app-state";
import { SCENARIOS } from "@/data/scenarios";

export const SCENARIO_TO_TYPE: Record<string, SignalType> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s.signalType])
);
