"use client";

import { useEffect, useRef, useState } from "react";
import { useTypewriter } from "@/hooks/use-typewriter";
import { cn } from "@/lib/utils";

const HASHING_STAGES = [
  { text: "Проверка формата файла...", duration: 1200 },
  { text: "Хеширование данных...", duration: 2000 },
  { text: "Подготовка к импорту...", duration: 1000 },
];

export function HashingLoader({ onComplete }: { onComplete: () => void }) {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = HASHING_STAGES[stageIndex];
  const { displayed, isDone } = useTypewriter(stage.text, 30);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isDone) return;
    const remaining = stage.duration - stage.text.length * 30;
    const id = setTimeout(() => {
      if (stageIndex < HASHING_STAGES.length - 1) {
        setStageIndex((i) => i + 1);
      } else {
        onCompleteRef.current();
      }
    }, Math.max(remaining, 300));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone, stageIndex, stage.duration, stage.text.length]);

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="h-8 flex items-center">
        <p className="text-sm font-medium text-foreground">
          {displayed}
          {!isDone && <span className="ml-0.5 animate-pulse opacity-60">|</span>}
        </p>
      </div>
      <div className="flex gap-1">
        {HASHING_STAGES.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 w-8 rounded-full transition-colors duration-500",
              i < stageIndex
                ? "bg-primary"
                : i === stageIndex
                ? "bg-primary/60"
                : "bg-border"
            )}
          />
        ))}
      </div>
    </div>
  );
}
