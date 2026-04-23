"use client";

import { X } from "lucide-react";
import { useAppDispatch } from "@/state/app-state-context";
import type { CampaignStatus } from "@/state/app-state";
import type { CampaignSort } from "@/state/parse-campaign-filter";
import { STATUS_LABELS } from "./status-badge";

const SORT_LABELS: Record<Exclude<CampaignSort, "default">, string> = {
  "profit-desc": "По прибыли ↓",
  "conversion-desc": "По конверсии ↓",
};

interface CampaignFilterChipsProps {
  statuses: CampaignStatus[];
  sort: CampaignSort;
}

export function CampaignFilterChips({
  statuses,
  sort,
}: CampaignFilterChipsProps) {
  const dispatch = useAppDispatch();
  const hasSort = sort !== "default";
  if (statuses.length === 0 && !hasSort) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Фильтр:
      </span>
      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() =>
            dispatch({ type: "campaigns_filter_remove", status })
          }
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          aria-label={`Убрать фильтр ${STATUS_LABELS[status]}`}
        >
          {STATUS_LABELS[status]}
          <X className="h-3 w-3 opacity-60" aria-hidden />
        </button>
      ))}
      {hasSort && (
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {SORT_LABELS[sort]}
        </span>
      )}
      <button
        type="button"
        onClick={() => dispatch({ type: "campaigns_filter_clear" })}
        className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Очистить
      </button>
    </div>
  );
}
