"use client";

import { useState } from "react";
import { Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StepContent } from "@/components/steps/step-content";
import { StepProps } from "@/types/campaign";

export function Step8Result({ data, onNext }: StepProps) {
  const [signalCount] = useState(() =>
    data.signalLimit
      ? Math.floor(data.signalLimit * (0.8 + Math.random() * 0.15))
      : 0
  );

  function handleDownload() {
    console.log("Download signals", { signalCount, data });
  }

  return (
    <StepContent
      title="Мы собрали сигналы по вашей базе"
      subtitle="Файл готов к скачиванию"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-6">
        {/* Signal count */}
        <div className="rounded-lg border border-border bg-card px-6 py-5 text-center">
          <p className="text-4xl font-bold tabular-nums text-foreground">
            {signalCount.toLocaleString("ru")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">сигналов найдено</p>
        </div>

        <Button onClick={handleDownload} variant="outline" className="w-full gap-2">
          <Download className="h-4 w-4" />
          Скачать сигналы
        </Button>

        <Separator />

        {/* What's next */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
          <p className="text-sm font-medium text-foreground">Готовы к запуску?</p>
          <p className="text-sm text-muted-foreground">
            Используйте собранные сигналы для настройки рекламной кампании
          </p>
          <Button
            onClick={() => onNext({})}
            className="w-full gap-2"
          >
            <Zap className="h-4 w-4" />
            Запустить кампанию
          </Button>
        </div>
      </div>
    </StepContent>
  );
}
