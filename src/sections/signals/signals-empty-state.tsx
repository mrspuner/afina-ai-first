"use client";

import { NewSignalMenu } from "./new-signal-menu";

interface SignalsEmptyStateProps {
  onCreate: () => void;
  onUpload: () => void;
}

export function SignalsEmptyState({ onCreate, onUpload }: SignalsEmptyStateProps) {
  return (
    <div className="fixed inset-0 left-[120px] flex flex-col items-center justify-center">
      <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
        Ещё нет сигналов. Создайте первый — или загрузите готовую базу с устройства.
      </p>
      <NewSignalMenu onCreate={onCreate} onUpload={onUpload} variant="primary" />
    </div>
  );
}
