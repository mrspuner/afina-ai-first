"use client";

import type { Signal } from "@/state/app-state";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

interface SignalRowProps {
  signal: Signal;
  onClick: (signalId: string) => void;
}

export function SignalRow({ signal, onClick }: SignalRowProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(signal.id)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-accent"
    >
      <p className="text-sm font-medium text-foreground">{signal.type}</p>
      <p className="text-xs text-muted-foreground">
        {formatNumber(signal.count)} · от {formatDate(signal.updatedAt)}
      </p>
    </button>
  );
}
