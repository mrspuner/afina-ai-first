"use client";

import { useState } from "react";
import { ChevronDown, Download, MessageCircle, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StepContent } from "@/sections/signals/steps/step-content";
import type { StepData } from "@/types/campaign";
import type { Signal } from "@/state/app-state";
import { cn } from "@/lib/utils";

interface Step8ResultProps {
  data: StepData;
  signal: Signal | null;
  onUseInCampaign: () => void;
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

function formatExpiry(): string {
  // Prototype copy — typical horizon for B2C verticals is ~14 days.
  const days = 14;
  return `Актуальны ещё ${days} дней`;
}

const SCENARIO_NAMES: Record<string, string> = {
  registration: "Регистрация",
  "first-deal": "Первая сделка",
  upsell: "Апсейл",
  retention: "Удержание",
  return: "Возврат",
  reactivation: "Реактивация",
};

export function Step8Result({ data, signal, onUseInCampaign }: Step8ResultProps) {
  const [triggerOpen, setTriggerOpen] = useState(false);
  const errorState = signal?.status === "error";
  const totalSignals = signal
    ? signal.segments.max +
      signal.segments.high +
      signal.segments.mid +
      signal.segments.low
    : 0;
  const zeroResult = !errorState && totalSignals === 0;

  function handleDownload() {
    // Prototype: this would emit a CSV from the backend.
    console.log("Download signals", signal?.id);
    window.alert(`Скачивание ${formatNumber(totalSignals)} сигналов (CSV) — в прототипе симулировано.`);
  }

  if (errorState) {
    return (
      <StepContent
        title="Что-то пошло не так при обработке"
        subtitle="Не удалось получить сигналы от провайдеров. Деньги возвращены на баланс."
      >
        <div className="flex flex-col gap-3">
          <Button onClick={onUseInCampaign} className="w-full gap-2">
            <RotateCcw className="h-4 w-4" />
            Попробовать снова
          </Button>
          <Button
            variant="outline"
            onClick={() => window.alert("Поддержка: support@afina.ai")}
            className="w-full gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Связаться с поддержкой
          </Button>
        </div>
      </StepContent>
    );
  }

  if (zeroResult) {
    return (
      <StepContent
        title="По вашей базе не найдено сигналов"
        subtitle="Возможно, аудитория неактивна сейчас, или подобраны слишком узкие триггеры. Деньги возвращены на баланс."
      >
        <div className="flex flex-col gap-3">
          <Button onClick={onUseInCampaign} className="w-full gap-2">
            Создать новый сигнал
          </Button>
        </div>
      </StepContent>
    );
  }

  const segments = signal?.segments;

  return (
    <StepContent
      title="Сигналы готовы"
      subtitle={`Получены ${signal ? new Date(signal.updatedAt).toLocaleString("ru-RU") : "—"}`}
    >
      <div className="flex flex-col gap-5">
        {/* Main count */}
        <div className="rounded-lg border border-border bg-card px-6 py-5 text-center">
          <p className="text-4xl font-bold tabular-nums text-foreground">
            {formatNumber(totalSignals)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">сигналов найдено</p>
          <p className="mt-2 text-xs text-muted-foreground">{formatExpiry()}</p>
        </div>

        {/* Segments */}
        {segments && (
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            <SegmentRow label="Сильно склонные" value={segments.max} tone="strong" />
            <SegmentRow label="Высоко склонные" value={segments.high} tone="high" />
            <SegmentRow label="Средне склонные" value={segments.mid} tone="mid" />
            <SegmentRow label="Слабо склонные" value={segments.low} tone="low" />
          </div>
        )}

        {/* Trigger breakdown — collapsed by default */}
        <button
          type="button"
          onClick={() => setTriggerOpen((v) => !v)}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
          aria-expanded={triggerOpen}
        >
          <span className="text-sm font-medium">Разбивка по триггерам</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              triggerOpen && "rotate-180"
            )}
          />
        </button>
        {triggerOpen && (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            {data.triggers.length ? (
              <ul className="flex flex-col gap-1.5 text-sm">
                {data.triggers.map((t) => (
                  <li
                    key={t}
                    className="flex items-center justify-between text-muted-foreground"
                  >
                    <span>{t}</span>
                    <span className="tabular-nums text-foreground">
                      {formatNumber(Math.floor(totalSignals / Math.max(1, data.triggers.length)))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Триггеры не указаны.
              </p>
            )}
            {data.scenario && (
              <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
                Сценарий: {SCENARIO_NAMES[data.scenario] ?? data.scenario}
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button onClick={handleDownload} variant="outline" className="w-full gap-2">
            <Download className="h-4 w-4" />
            Скачать сигналы (CSV)
          </Button>
          <Button onClick={onUseInCampaign} className="w-full gap-2">
            <Zap className="h-4 w-4" />
            Использовать в кампании
          </Button>
        </div>
      </div>
    </StepContent>
  );
}

function SegmentRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "strong" | "high" | "mid" | "low";
}) {
  const dotClass =
    tone === "strong"
      ? "bg-emerald-500"
      : tone === "high"
      ? "bg-emerald-400"
      : tone === "mid"
      ? "bg-amber-400"
      : "bg-muted-foreground/50";
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", dotClass)} />
        {label}
      </span>
      <span className="font-semibold tabular-nums">{formatNumber(value)}</span>
    </div>
  );
}
