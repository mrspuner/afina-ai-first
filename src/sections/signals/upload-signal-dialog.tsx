"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropZone } from "@/components/ui/drop-zone";
import { HashingLoader } from "@/components/ui/hashing-loader";
import { useAppDispatch } from "@/state/app-state-context";
import type { Signal } from "@/state/app-state";

interface UploadSignalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildSignalFromFile(_file: File): Signal {
  const count = Math.floor(Math.random() * 4500) + 500;
  const now = new Date().toISOString();
  return {
    id: `sig_${nanoid(6)}`,
    type: "Регистрация",
    count,
    segments: { max: 0, high: 0, mid: count, low: 0 },
    createdAt: now,
    updatedAt: now,
  };
}

export function UploadSignalDialog({ open, onOpenChange }: UploadSignalDialogProps) {
  const dispatch = useAppDispatch();
  const [file, setFile] = useState<File | null>(null);
  const [isHashing, setIsHashing] = useState(false);

  function handleImport() {
    if (!file) return;
    setIsHashing(true);
  }

  function handleHashingComplete() {
    if (!file) return;
    const signal = buildSignalFromFile(file);
    dispatch({ type: "signal_added", signal });
    dispatch({ type: "sidebar_nav", section: "Сигналы" });
    setFile(null);
    setIsHashing(false);
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setFile(null);
      setIsHashing(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Загрузите файл с номерами</DialogTitle>
          <DialogDescription>
            CSV, XLSX, TXT · до 50 МБ · по одному номеру на строку
          </DialogDescription>
        </DialogHeader>

        {isHashing ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-card">
            <HashingLoader onComplete={handleHashingComplete} />
          </div>
        ) : (
          <DropZone accept=".csv,.xlsx,.txt" file={file} onFile={setFile} />
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isHashing}
          >
            Отмена
          </Button>
          <Button onClick={handleImport} disabled={!file || isHashing}>
            Импортировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
