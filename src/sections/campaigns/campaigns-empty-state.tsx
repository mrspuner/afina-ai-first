"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CampaignsEmptyStateProps {
  onGoToSignals: () => void;
}

export function CampaignsEmptyState({ onGoToSignals }: CampaignsEmptyStateProps) {
  return (
    <div className="fixed inset-0 left-[120px] flex flex-col items-center justify-center">
      <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
        Кампании создаются из Сигналов
      </p>
      <Button onClick={onGoToSignals}>
        Создать сигнал
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
