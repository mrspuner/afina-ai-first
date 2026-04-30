"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/ui/drop-zone";
import { HashingLoader } from "@/components/ui/hashing-loader";
import { StepContent } from "@/sections/signals/steps/step-content";
import { StepProps } from "@/types/campaign";

export function Step4Upload({ data, onNext }: StepProps) {
  const [file, setFile] = useState<File | null>(data.file);
  const [isHashing, setIsHashing] = useState(false);

  /** Simulate parsing the file by attaching a plausible row count. The real
   *  product would parse server-side; for the prototype a stable random in
   *  the 1k-100k range is enough to drive downstream UI (budget recommend). */
  function simulateRowCount(): number {
    return 1000 + Math.floor(Math.random() * 99_000);
  }

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
    // Carry a freshly simulated row count if we don't already have one for
    // this exact file — repeat visits to the step keep the prior value so
    // the budget recommendation stays stable.
    const rowCount =
      data.file === file && typeof data.fileRowCount === "number"
        ? data.fileRowCount
        : simulateRowCount();
    onNext({ file, fileRowCount: rowCount });
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

        <div className="flex justify-start">
          <Button disabled={!file || isHashing} onClick={handleNext}>
            Далее
          </Button>
        </div>
      </div>
    </StepContent>
  );
}
