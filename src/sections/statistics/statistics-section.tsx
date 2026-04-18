"use client";

import { useAppState } from "@/state/app-state-context";
import { StatisticsView } from "./statistics-view";

export function StatisticsSection() {
  const { view } = useAppState();
  const campaignId =
    view.kind === "section" && view.name === "Статистика"
      ? view.campaignId
      : undefined;
  return <StatisticsView campaignId={campaignId} />;
}
