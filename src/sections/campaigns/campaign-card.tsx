"use client";

import { Card } from "@/components/ui/card";
import type { Campaign, Signal } from "@/state/app-state";
import { StatusBadge } from "./status-badge";
import {
  formatCompactRub,
  formatCount,
  getCampaignStats,
} from "./mock-stats";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU");
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

function timestampLine(c: Campaign): string {
  if (c.status === "active" && c.launchedAt) return `Запущена ${formatDate(c.launchedAt)}`;
  if (c.status === "scheduled" && c.scheduledFor) return `Запуск ${formatDate(c.scheduledFor)}`;
  if (c.status === "completed" && c.completedAt) return `Завершена ${formatDate(c.completedAt)}`;
  return `Черновик от ${formatDate(c.createdAt)}`;
}

interface CampaignCardProps {
  campaign: Campaign;
  signal: Signal | undefined;
  onOpen: (id: string) => void;
}

export function CampaignCard({ campaign, signal, onOpen }: CampaignCardProps) {
  const signalLine = signal
    ? `Сигнал: ${signal.type} · ${formatNumber(signal.count)}`
    : "Сигнал: —";

  const showStats =
    campaign.status === "active" || campaign.status === "completed";
  const stats = showStats ? getCampaignStats(campaign, signal) : null;

  return (
    <Card
      className="cursor-pointer gap-2 px-5 py-4 transition-colors hover:bg-accent"
      onClick={() => onOpen(campaign.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(campaign.id);
        }
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{campaign.name}</p>
        <StatusBadge status={campaign.status} />
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted-foreground">{signalLine}</p>
        <p className="text-xs text-muted-foreground">{timestampLine(campaign)}</p>
      </div>
      {stats && (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-2 text-xs">
          <StatItem label="Охват" value={formatCount(stats.reach)} />
          <StatItem
            label="Конверсия"
            value={`${stats.conversionPct.toFixed(1)}%`}
          />
          <StatItem
            label="Прибыль"
            value={formatCompactRub(stats.profit)}
            tone={stats.profit >= 0 ? "positive" : "negative"}
          />
        </div>
      )}
    </Card>
  );
}

function StatItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </span>
  );
}
