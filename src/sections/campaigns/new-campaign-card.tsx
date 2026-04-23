"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NewCampaignCardProps {
  onGoToSignals: () => void;
}

export function NewCampaignCard({ onGoToSignals }: NewCampaignCardProps) {
  return (
    <Card className="gap-2 border-2 border-dashed border-border bg-transparent px-5 py-4 ring-0">
      <p className="text-sm font-semibold text-foreground">
        Создать новую кампанию
      </p>
      <p className="text-xs text-muted-foreground">
        Выберите сигнал, на базе которого запустить кампанию.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Button onClick={onGoToSignals}>
          Перейти в Сигналы
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
