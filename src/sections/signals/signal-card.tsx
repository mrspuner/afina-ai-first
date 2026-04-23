"use client";

import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <Card className="animate-in fade-in-0 slide-in-from-bottom-2 gap-2 px-5 py-4 [--tw-animation-duration:220ms] [--tw-ease:cubic-bezier(0.23,1,0.32,1)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {type} · {formatNumber(count)}
          </p>
          {signal.isCustom && <Badge variant="secondary">Пользовательский</Badge>}
        </div>
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
