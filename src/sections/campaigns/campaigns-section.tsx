"use client";

import { useMemo } from "react";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { CampaignCard } from "./campaign-card";
import { CampaignsEmptyState } from "./campaigns-empty-state";
import type { Campaign } from "@/state/app-state";

function relevantTimestamp(c: Campaign): string {
  return c.launchedAt ?? c.scheduledFor ?? c.completedAt ?? c.createdAt;
}

export function CampaignsSection() {
  const { signals, campaigns } = useAppState();
  const dispatch = useAppDispatch();

  const sorted = useMemo(
    () =>
      [...campaigns].sort((a, b) =>
        relevantTimestamp(a) < relevantTimestamp(b) ? 1 : -1
      ),
    [campaigns]
  );

  const signalById = useMemo(
    () => new Map(signals.map((s) => [s.id, s])),
    [signals]
  );

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto px-8 pb-40 pt-[140px]">
        <div className="mx-auto flex w-full max-w-2xl flex-col">
          <h1 className="mb-6 text-[38px] font-semibold leading-[46px] tracking-tight">
            Кампании
          </h1>
          <CampaignsEmptyState
            onGoToSignals={() => dispatch({ type: "sidebar_nav", section: "Сигналы" })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pb-40 pt-[140px]">
      <div className="mx-auto flex w-full max-w-2xl flex-col">
        <h1 className="mb-6 text-[38px] font-semibold leading-[46px] tracking-tight">
          Кампании
        </h1>
        <div className="flex flex-col gap-3">
          {sorted.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              signal={signalById.get(c.signalId)}
              onOpen={(id) => dispatch({ type: "campaign_opened", id })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
