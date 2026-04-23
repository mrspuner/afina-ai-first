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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch } from "@/state/app-state-context";
import { SIGNAL_TYPES, type Signal, type SignalType } from "@/state/app-state";

interface UploadSignalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function buildSignalFromFile(type: SignalType): Signal {
  const count = Math.floor(Math.random() * 4500) + 500;
  const now = new Date().toISOString();
  return {
    id: `sig_${nanoid(6)}`,
    type,
    count,
    segments: { max: 0, high: 0, mid: count, low: 0 },
    createdAt: now,
    updatedAt: now,
    isCustom: true,
  };
}

export function UploadSignalDialog({ open, onOpenChange }: UploadSignalDialogProps) {
  const dispatch = useAppDispatch();
  const [file, setFile] = useState<File | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [type, setType] = useState<SignalType | null>(null);
  const [typeError, setTypeError] = useState(false);

  function handleImport() {
    if (!file) return;
    if (!type) {
      setTypeError(true);
      return;
    }
    setIsHashing(true);
  }

  function handleHashingComplete() {
    if (!file || !type) return;
    const signal = buildSignalFromFile(type);
    dispatch({ type: "signal_added", signal });
    dispatch({ type: "sidebar_nav", section: "Сигналы" });
    setFile(null);
    setIsHashing(false);
    setType(null);
    setTypeError(false);
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setFile(null);
      setIsHashing(false);
      setType(null);
      setTypeError(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md [--tw-animation-duration:220ms] [--tw-ease:cubic-bezier(0.23,1,0.32,1)] data-closed:[--tw-animation-duration:160ms]"
      >
        <DialogHeader>
          <DialogTitle>Загрузите файл с номерами</DialogTitle>
          <DialogDescription>
            CSV, XLSX, TXT · до 50 МБ · по одному номеру на строку
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signal-type"
            className="text-xs font-medium text-muted-foreground"
          >
            Тип сигнала
          </label>
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as SignalType);
              setTypeError(false);
            }}
            disabled={isHashing}
          >
            <SelectTrigger
              id="signal-type"
              className="w-full"
              aria-invalid={typeError || undefined}
            >
              <SelectValue placeholder="Выберите тип сигнала" />
            </SelectTrigger>
            <SelectContent>
              {SIGNAL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeError && (
            <p className="animate-in fade-in-0 slide-in-from-top-1 text-xs text-destructive [--tw-animation-duration:180ms] [--tw-ease:cubic-bezier(0.23,1,0.32,1)]">
              Выберите тип сигнала, прежде чем импортировать
            </p>
          )}
        </div>

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
