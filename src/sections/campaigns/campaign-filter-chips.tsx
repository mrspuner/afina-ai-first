"use client";

import { X } from "lucide-react";
import { useAppDispatch } from "@/state/app-state-context";
import type { CampaignStatus } from "@/state/app-state";
import { STATUS_LABELS } from "./status-badge";

interface CampaignFilterChipsProps {
  statuses: CampaignStatus[];
}

export function CampaignFilterChips({ statuses }: CampaignFilterChipsProps) {
  const dispatch = useAppDispatch();
  if (statuses.length === 0) return null;

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
