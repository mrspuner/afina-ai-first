"use client";

import { useMemo } from "react";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { CampaignCard } from "./campaign-card";
import { NewCampaignCard } from "./new-campaign-card";
import { NewCampaignMenu } from "./new-campaign-menu";
import { CampaignFilterChips } from "./campaign-filter-chips";
import { CampaignsNoResults } from "./campaigns-no-results";
import { getCampaignStats } from "./mock-stats";
import type { Campaign, Signal } from "@/state/app-state";

function relevantTimestamp(c: Campaign): string {
  return c.launchedAt ?? c.scheduledFor ?? c.completedAt ?? c.createdAt;
}

function hasStats(c: Campaign): boolean {
  return c.status === "active" || c.status === "completed";
}

function profitFor(c: Campaign, signal: Signal | undefined): number {
  if (!hasStats(c)) return Number.NEGATIVE_INFINITY;
  return getCampaignStats(c, signal).profit;
}

function conversionFor(c: Campaign, signal: Signal | undefined): number {
  if (!hasStats(c)) return Number.NEGATIVE_INFINITY;
  return getCampaignStats(c, signal).conversionPct;
}

export function CampaignsSection() {
  const { signals, campaigns, campaignFilter, campaignSort } = useAppState();
  const dispatch = useAppDispatch();

  const signalById = useMemo(
    () => new Map(signals.map((s) => [s.id, s])),
    [signals]
  );

  const sorted = useMemo(() => {
    const arr = [...campaigns];
    if (campaignSort === "profit-desc") {
      arr.sort(
        (a, b) =>
          profitFor(b, signalById.get(b.signalId)) -
          profitFor(a, signalById.get(a.signalId))
      );
    } else if (campaignSort === "conversion-desc") {
      arr.sort(
        (a, b) =>
          conversionFor(b, signalById.get(b.signalId)) -
          conversionFor(a, signalById.get(a.signalId))
      );
    } else {
      arr.sort((a, b) =>
        relevantTimestamp(a) < relevantTimestamp(b) ? 1 : -1
      );
    }
    return arr;
  }, [campaigns, campaignSort, signalById]);

  const filtered = useMemo(
    () =>
      campaignFilter.length === 0
        ? sorted
        : sorted.filter((c) => campaignFilter.includes(c.status)),
    [sorted, campaignFilter]
  );

  const goToSignals = () =>
    dispatch({ type: "sidebar_nav", section: "Сигналы" });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pb-40 pt-[140px]">
      <div className="mx-auto flex w-full max-w-2xl flex-col">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h1 className="text-[38px] font-semibold leading-[46px] tracking-tight">
            Кампании
          </h1>
          {campaigns.length > 0 && (
            <NewCampaignMenu onGoToSignals={goToSignals} />
          )}
        </div>

        {campaigns.length === 0 ? (
          <NewCampaignCard onGoToSignals={goToSignals} />
        ) : (
          <>
            <CampaignFilterChips
              statuses={campaignFilter}
              sort={campaignSort}
            />
            {filtered.length === 0 ? (
              <CampaignsNoResults />
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((c) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    signal={signalById.get(c.signalId)}
                    onOpen={(id) => dispatch({ type: "campaign_opened", id })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
