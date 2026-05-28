"use client";

import { CheckCircle2, Download, Zap } from "lucide-react";
import {
  EntityCardShell,
  CardTag,
  CardSection,
} from "@/components/ui/entity-card";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { SIGNAL_STATUS_LABEL } from "@/types/signal-status";
import { SCENARIO_NAMES, SEGMENT_NAMES } from "./signal-summary-data";

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

export function SignalScreen() {
  const { view, signals } = useAppState();
  const dispatch = useAppDispatch();

  if (view.kind !== "signal") return null;

  const signal = signals.find((s) => s.id === view.signal.id);
  if (!signal) return null;

  const status = signal.status ?? "ready";
  const isReady = status === "ready";
  const total =
    signal.segments.max +
    signal.segments.high +
    signal.segments.mid +
    signal.segments.low;
  const title = signal.name ?? signal.type;
  const wd = signal.wizardData;

  function handleDownload() {
    // Prototype: a real backend would emit a CSV here.
    console.log("download signal", signal.id);
    window.alert(
      `Скачивание ${formatNumber(total)} сигналов (CSV) — в прототипе симулировано.`,
    );
  }

  return (
    <EntityCardShell
      title={title}
      onRename={(name) => dispatch({ type: "signal_renamed", id: signal.id, name })}
      badge={!isReady ? <CardTag>{SIGNAL_STATUS_LABEL[status]}</CardTag> : undefined}
      tags={
        <CardTag>
          {signal.type} · {formatNumber(signal.count)}
        </CardTag>
      }
      meta={
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
          Сигналы получены · {new Date(signal.updatedAt).toLocaleString("ru-RU")}
        </span>
      }
      primaryAction={{
        label: "Запустить кампанию по сигналу",
        onClick: () => dispatch({ type: "campaign_from_signal", signalId: signal.id }),
        icon: <Zap className="h-4 w-4" />,
      }}
      secondaryActions={[
        {
          label: "Скачать",
          onClick: handleDownload,
          icon: <Download className="h-4 w-4" />,
        },
      ]}
    >
      {/* Total signals */}
      <CardSection label="Всего сигналов">
        <p className="text-4xl font-bold tabular-nums text-brand">
          {formatNumber(total)}
        </p>
      </CardSection>

      {/* Settings table (step-6 summary) */}
      <CardSection label="Настройки сигнала">
        <div className="divide-y divide-border">
          <SummaryRow
            label="Сценарий"
            value={wd?.scenario ? SCENARIO_NAMES[wd.scenario] ?? "—" : "—"}
          />
          <SummaryRow
            label="Интересы"
            value={wd?.interests.length ? wd.interests.join(", ") : "—"}
          />
          <SummaryRow
            label="Триггеры"
            value={wd?.triggers.length ? wd.triggers.join(", ") : "—"}
          />
          <SummaryRow
            label="Сегменты"
            value={
              wd?.segments.length
                ? wd.segments.map((s) => SEGMENT_NAMES[s] ?? s).join("; ")
                : "—"
            }
          />
          <SummaryRow label="Файл с базой" value={wd?.file ? wd.file.name : "—"} />
          <SummaryRow
            label="Максимальный бюджет"
            value={wd?.budget ? `₽ ${wd.budget.toLocaleString("ru-RU")}` : "—"}
          />
        </div>
      </CardSection>
    </EntityCardShell>
  );
}
