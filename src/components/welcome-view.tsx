"use client";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface WelcomeViewProps {
  onStep1Click: () => void;
}

const steps = [
  { n: 1, label: "Получение сигнала", active: true },
  { n: 2, label: "Запуск кампании", active: false },
  { n: 3, label: "Статистика кампании", active: false },
];

export function WelcomeView({ onStep1Click }: WelcomeViewProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex w-full max-w-[480px] flex-col items-center gap-8">
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Добро пожаловать
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Три шага до первой кампании —<br />
            начните с получения сигналов
          </p>
        </div>

        {/* Chat input */}
        <div className="w-full">
          <PromptInputProvider>
            <PromptInput>
              <PromptInputBody>
                <PromptInputTextarea placeholder="Выберите шаг или задайте вопрос…" />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputSubmit />
              </PromptInputFooter>
            </PromptInput>
          </PromptInputProvider>
        </div>

        {/* Step badges */}
        <div className="flex w-full flex-col gap-1.5">
          {steps.map(({ n, label, active }) => (
            <button
              key={n}
              type="button"
              disabled={!active}
              onClick={active ? onStep1Click : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                active
                  ? "cursor-pointer border-border bg-card hover:bg-accent"
                  : "cursor-not-allowed border-border/40 bg-card/40 opacity-35"
              )}
            >
              <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                Шаг {n}
              </span>
              <div className="h-3 w-px shrink-0 bg-border" />
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
              {active && (
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
