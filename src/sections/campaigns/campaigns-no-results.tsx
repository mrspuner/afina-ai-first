"use client";

import { useAppDispatch } from "@/state/app-state-context";

export function CampaignsNoResults() {
  const dispatch = useAppDispatch();
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        Нет кампаний с такими статусами.
      </p>
      <button
        type="button"
        onClick={() => dispatch({ type: "campaigns_filter_clear" })}
        className="text-xs text-primary underline-offset-4 hover:underline"
      >
        Очистить фильтр
      </button>
    </div>
  );
}
