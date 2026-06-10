"use client";

import { Card } from "@/components/ui/card";
import type { Campaign, Signal } from "@/state/app-state";
import { StatusBadge } from "./status-badge";
import { getCampaignCardMetrics } from "./campaign-metrics";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU");
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

/** Компактный рубль: точные значения до 10 тыс., дальше — «тыс»/«млн». */
function formatRub(value: number): string {
  const abs = Math.round(value);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)} млн ₽`;
  if (abs >= 10_000) return `${Math.round(abs / 1_000)} тыс ₽`;
  return `${abs.toLocaleString("ru-RU")} ₽`;
}

function timestampLine(c: Campaign): string {
  if (c.status === "active" && c.launchedAt) return `Запущена ${formatDate(c.launchedAt)}`;
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

  const metrics = getCampaignCardMetrics(campaign, signal);

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
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-2 text-xs">
        {metrics.launched && (
          <>
            <StatItem label="Отправки" value={formatNumber(metrics.sends)} />
            <StatItem label="CR" value={`${metrics.crPct.toFixed(1)}%`} />
          </>
        )}
        <StatItem
          label="Бюджет"
          value={
            metrics.launched
              ? `расчётный ${formatRub(metrics.plannedBudget)} · факт ${formatRub(metrics.actualSpend)}`
              : `расчётный ${formatRub(metrics.plannedBudget)}`
          }
        />
      </div>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}
