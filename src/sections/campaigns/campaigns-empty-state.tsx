"use client";

import { GhostCard } from "@/components/ui/ghost-card";

interface CampaignsEmptyStateProps {
  onGoToSignals: () => void;
}

export function CampaignsEmptyState({ onGoToSignals }: CampaignsEmptyStateProps) {
  return (
    <GhostCard
      description="У вас ещё нет кампаний. Создайте сигнал — кампания появится здесь."
      actionLabel="Создать сигнал"
      onAction={onGoToSignals}
    />
  );
}
