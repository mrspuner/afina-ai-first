"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepContent } from "@/components/steps/step-content";
import { StepProps } from "@/types/campaign";
import { useTypewriter } from "@/hooks/use-typewriter";
import { cn } from "@/lib/utils";

const HASHING_STAGES = [
  { text: "Проверка формата файла...", duration: 1200 },
  { text: "Хеширование данных...", duration: 2000 },
  { text: "Подготовка к импорту...", duration: 1000 },
];

function HashingLoader({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = HASHING_STAGES[stageIndex];
  const { displayed, isDone } = useTypewriter(stage.text, 30);

  useEffect(() => {
    if (!isDone) return;
    const remaining = stage.duration - stage.text.length * 30;
    const id = setTimeout(() => {
      if (stageIndex < HASHING_STAGES.length - 1) {
        setStageIndex((i) => i + 1);
      } else {
        onComplete();
      }
    }, Math.max(remaining, 300));
    return () => clearTimeout(id);
  }, [isDone, stageIndex, stage.duration, stage.text.length, onComplete]);

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

export function Step5Upload({ data, onNext }: StepProps) {
  const [file, setFile] = useState<File | null>(data.file);
  const [isDragging, setIsDragging] = useState(false);
  const [isHashing, setIsHashing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleNext() {
    setIsHashing(true);
  }

  function handleHashingComplete() {
    onNext({ file });
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <StepContent
      title="Загрузите вашу базу"
      subtitle="Файл с номерами телефонов. Данные будут автоматически захешированы перед отправкой"
    >
      <div className="flex flex-col gap-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isHashing && inputRef.current?.click()}
          className={cn(
            "relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
            isDragging
              ? "border-primary bg-accent"
              : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {isHashing ? (
            <HashingLoader onComplete={handleHashingComplete} />
          ) : file ? (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              <p className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
                Нажмите чтобы заменить
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Перетащите файл или нажмите для выбора
              </p>
            </div>
          )}
        </div>

        {/* File format hint */}
        <p className="text-center text-xs text-muted-foreground">
          Поддерживаемые форматы: CSV, XLSX, TXT · Максимальный размер: 50 МБ · До 1 000 000
          строк · Один номер на строку
        </p>

        <div className="flex justify-end">
          <Button disabled={!file || isHashing} onClick={handleNext}>
            Далее
          </Button>
        </div>
      </div>
    </StepContent>
  );
}
