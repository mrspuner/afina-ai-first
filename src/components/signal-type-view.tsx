"use client";

import { StepContent } from "@/components/steps/step-content";

interface SignalTypeViewProps {
  onCreateSignal: () => void;
}

export function SignalTypeView({ onCreateSignal }: SignalTypeViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-40 pt-10">
      <StepContent
        title="Нет сигналов"
        subtitle="Вы не создали ещё ни одного сигнала. Перед тем как запустить кампанию, сформируйте первый сигнал."
      >
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onCreateSignal}
            className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Создать сигнал
          </button>
        </div>
      </StepContent>
    </div>
  );
}
