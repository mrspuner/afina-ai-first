"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/ui/drop-zone";
import { HashingLoader } from "@/components/ui/hashing-loader";
import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps } from "@/types/campaign";

export function Step5Upload({ data, onNext }: StepProps) {
  const [file, setFile] = useState<File | null>(data.file);
  const [isHashing, setIsHashing] = useState(false);

  function handleNext() {
    // Already-hashed file on revisit — skip re-hashing, just proceed.
    if (file && file === data.file) {
      onNext({ file });
      return;
    }
    setIsHashing(true);
  }

  function handleHashingComplete() {
    setIsHashing(false);
    onNext({ file });
  }

  return (
    <StepContent
      title="Загрузите вашу базу"
      subtitle="Файл с номерами телефонов. Данные будут автоматически захешированы перед отправкой"
    >
      <div className="flex flex-col gap-4">
        {isHashing ? (
          <div className="relative flex min-h-[160px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card">
            <HashingLoader onComplete={handleHashingComplete} />
          </div>
        ) : (
          <DropZone
            accept=".csv,.xlsx,.txt"
            file={file}
            onFile={setFile}
          />
        )}

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
