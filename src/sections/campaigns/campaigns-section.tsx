"use client";

// Adapter (Block A.5): in standalone mode, shows the first active/completed
// campaign via the legacy CampaignTypeView. Replaced in Block B with a real
// list of campaign cards (active / completed / scheduled / draft).

import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { CampaignTypeView } from "./campaign-type-view";

export function CampaignsSection({ mode }: { mode: "guided" | "standalone" }) {
  const { signals, campaigns } = useAppState();
  const dispatch = useAppDispatch();

  if (mode === "guided") {
    return (
      <CampaignTypeView
        onSelect={(id, name) =>
          dispatch({ type: "campaign_selected", campaign: { id, name } })
        }
      />
    );
  }

  const launched =
    campaigns.find((c) => c.status === "active" || c.status === "completed") ?? null;

  return (
    <CampaignTypeView
      onSelect={(id, name) =>
        dispatch({ type: "campaign_selected", campaign: { id, name } })
      }
      noSignal={signals.length === 0}
      campaign={
        launched
          ? {
              typeName: launched.name,
              launchedAt: launched.launchedAt
                ? new Date(launched.launchedAt).toLocaleDateString("ru-RU")
                : new Date(launched.createdAt).toLocaleDateString("ru-RU"),
            }
          : null
      }
    />
  );
}
