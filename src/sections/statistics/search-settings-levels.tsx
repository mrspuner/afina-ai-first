"use client";

import type { DrillLevel } from "./drill-in-popover";
import { SearchConditionsBlock } from "./search-conditions";
import type {
  StatisticsAction,
  StatisticsFilters,
} from "./statistics-state";

export function buildSearchSettingsLevel(
  draft: StatisticsFilters,
  dispatch: (action: StatisticsAction) => void,
): DrillLevel {
  return {
    id: "search-root",
    title: "Условия поиска",
    render: () => (
      <div className="p-2">
        <SearchConditionsBlock conditions={draft.conditions} dispatch={dispatch} />
      </div>
    ),
  };
}
