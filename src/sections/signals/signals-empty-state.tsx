"use client";

import { NewSignalMenu } from "./new-signal-menu";

interface SignalsEmptyStateProps {
  onCreate: () => void;
  onUpload: () => void;
}

export function SignalsEmptyState({ onCreate, onUpload }: SignalsEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16">
      <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
        Ещё нет сигналов. Создайте первый — или загрузите готовую базу с устройства.
      </p>
      <NewSignalMenu onCreate={onCreate} onUpload={onUpload} variant="primary" />
    </div>
  );
}
