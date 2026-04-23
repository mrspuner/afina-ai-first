"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScheduleCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (iso: string) => void;
  campaignName: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toLocalInputValue(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function defaultDate(): Date {
  const d = new Date(Date.now() + 15 * 60_000);
  const minutes = d.getMinutes();
  const rounded = Math.ceil(minutes / 5) * 5;
  d.setMinutes(rounded, 0, 0);
  return d;
}

function minDate(): Date {
  return new Date(Date.now() + 5 * 60_000);
}

export function ScheduleCampaignDialog({
  open,
  onOpenChange,
  onConfirm,
  campaignName,
}: ScheduleCampaignDialogProps) {
  const [value, setValue] = useState<string>(() =>
    toLocalInputValue(defaultDate()),
  );

  // Reset to a fresh default each time the dialog reopens — intentional
  // external (open prop) → internal (input value) sync.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(toLocalInputValue(defaultDate()));
    }
  }, [open]);

  const min = useMemo(() => toLocalInputValue(minDate()), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = value ? new Date(value) : null;
  const isInFuture =
    selected !== null && !Number.isNaN(selected.getTime()) && selected > new Date();

  function handleConfirm() {
    if (!isInFuture || !selected) return;
    onConfirm(selected.toISOString());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Запланировать запуск</DialogTitle>
          <DialogDescription>
            Кампания «{campaignName}» запустится автоматически в выбранное
            время.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="schedule-datetime"
            className="text-sm font-medium text-foreground"
          >
            Дата и время
          </label>
          <input
            id="schedule-datetime"
            type="datetime-local"
            value={value}
            min={min}
            onChange={(e) => setValue(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {!isInFuture && value && (
            <p className="text-xs text-destructive">
              Дата должна быть в будущем
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={!isInFuture}>
            Запланировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
