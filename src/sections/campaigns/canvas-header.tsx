"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Campaign, Signal } from "@/state/app-state";

export interface CanvasHeaderToast {
  kind: "error" | "info";
  text: string;
}

interface CanvasHeaderProps {
  campaign: Campaign;
  signal: Signal | null;
  onRename: (name: string) => void;
  onSaveDraft: () => void;
  onLaunch: () => void;
  toast?: CanvasHeaderToast | null;
  onDismissToast?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

export function CanvasHeader({
  campaign,
  signal,
  onRename,
  onSaveDraft,
  onLaunch,
  toast,
  onDismissToast,
}: CanvasHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(campaign.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resync draft name when the campaign is renamed externally (e.g.,
  // reducer-driven rename from another surface). eslint-disable is used
  // so the rule react-hooks/set-state-in-effect doesn't flag the intentional
  // external→internal state sync.
  useEffect(() => {
    if (!editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftName(campaign.name);
    }
  }, [campaign.name, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit() {
    setDraftName(campaign.name);
    setEditing(true);
  }

  function commit() {
    const next = draftName.trim();
    setEditing(false);
    if (!next || next === campaign.name) return;
    onRename(next);
  }

  function cancel() {
    setEditing(false);
  }

  const signalLine = signal
    ? `${signal.type} · ${formatNumber(signal.count)} · от ${formatDate(signal.updatedAt)}`
    : "Сигнал не привязан";

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background/90 px-6 py-3 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {editing ? (
            <Input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") cancel();
              }}
              aria-label="Название кампании"
              className="h-9 max-w-sm text-xl font-semibold"
            />
          ) : (
            <button
              type="button"
              onClick={startEdit}
              aria-label="Переименовать кампанию"
              className="group flex items-center gap-2 self-start rounded-md text-left text-xl font-semibold text-foreground hover:text-foreground/80"
            >
              <span className="truncate">{campaign.name}</span>
              <Pencil className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
            </button>
          )}
          <p
            className={
              signal
                ? "text-xs text-muted-foreground"
                : "text-xs font-medium text-destructive"
            }
          >
            {signalLine}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={onSaveDraft}>
            Сохранить черновик
          </Button>
          <Button onClick={onLaunch}>Запустить</Button>
        </div>
      </div>

      {toast && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className={
            toast.kind === "error"
              ? "mt-2 flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
              : "mt-2 flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
          }
        >
          <span>{toast.text}</span>
          {onDismissToast && (
            <button
              type="button"
              aria-label="Закрыть"
              onClick={onDismissToast}
              className="opacity-60 hover:opacity-100"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
