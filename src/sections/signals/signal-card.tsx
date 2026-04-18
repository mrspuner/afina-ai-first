"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Signal } from "@/state/app-state";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU");
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

interface SignalCardProps {
  signal: Signal;
  onCreateCampaign: (signalId: string) => void;
  onDownload: (signalId: string) => void;
}

export function SignalCard({ signal, onCreateCampaign, onDownload }: SignalCardProps) {
  const { type, count, segments, updatedAt, id } = signal;
  return (
    <Card className="gap-2 px-5 py-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-foreground">
          {type} · {formatNumber(count)}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(updatedAt)}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Макс {formatNumber(segments.max)} · Выс {formatNumber(segments.high)} · Ср{" "}
        {formatNumber(segments.mid)} · Низ {formatNumber(segments.low)}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Button onClick={() => onCreateCampaign(id)}>Создать кампанию</Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Скачать сигналы"
          onClick={() => onDownload(id)}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
