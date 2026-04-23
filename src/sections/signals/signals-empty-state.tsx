"use client";

import { Card } from "@/components/ui/card";
import { NewSignalMenu } from "./new-signal-menu";

interface SignalsEmptyStateProps {
  onCreate: () => void;
  onUpload: () => void;
}

export function SignalsEmptyState({ onCreate, onUpload }: SignalsEmptyStateProps) {
  return (
    <Card className="gap-2 border-2 border-dashed border-border bg-transparent px-5 py-4 ring-0">
      <p className="text-sm font-semibold text-foreground">Ещё нет сигналов</p>
      <p className="text-xs text-muted-foreground">
        Создайте первый — или загрузите готовую базу с устройства.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <NewSignalMenu onCreate={onCreate} onUpload={onUpload} variant="primary" />
      </div>
    </Card>
  );
}
