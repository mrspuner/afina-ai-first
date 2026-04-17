"use client";

import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { CampaignTypeView } from "./campaign-type-view";

export function CampaignsSection({ mode }: { mode: "guided" | "standalone" }) {
  const { signal, launchedCampaign } = useAppState();
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

  return (
    <CampaignTypeView
      onSelect={(id, name) =>
        dispatch({ type: "campaign_selected", campaign: { id, name } })
      }
      noSignal={signal === null}
      campaign={launchedCampaign}
    />
  );
}
