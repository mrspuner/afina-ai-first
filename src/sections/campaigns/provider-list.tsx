"use client";

import { useEffect, useRef, useState } from "react";
import { PROVIDERS, type Provider, type ProviderStage } from "@/data/providers";
import { cn } from "@/lib/utils";

/**
 * Animated data-provider status list shown on the launched-campaign screen.
 * On mount each provider with a `connectAfterMs` timer walks Подключение →
 * Премодерация → Подключён. Stuck providers (Tele2) freeze on `stuckStage`.
 * Only the status text and dot change — no layout shifts.
 */
export function ProviderList() {
  const [stages, setStages] = useState<Record<string, ProviderStage>>(() =>
    Object.fromEntries(PROVIDERS.map((p) => [p.id, "Подключение" as ProviderStage]))
  );

  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    const timeouts = timeoutsRef.current;

    for (const p of PROVIDERS) {
      if (p.connectAfterMs === null) {
        if (p.stuckStage && p.stuckStage !== "Подключение") {
          // Move stuck providers off "Подключение" to their stuck stage so
          // they read as "in progress" rather than "untouched".
          const halfway = setTimeout(() => {
            setStages((prev) => ({ ...prev, [p.id]: p.stuckStage! }));
          }, 800);
          timeouts.push(halfway);
        }
        continue;
      }
      // Premoderation kicks in at ~40% of the connect duration.
      const premoderationAt = Math.max(400, Math.round(p.connectAfterMs * 0.4));
      const t1 = setTimeout(() => {
        setStages((prev) => ({ ...prev, [p.id]: "Премодерация" }));
      }, premoderationAt);
      const t2 = setTimeout(() => {
        setStages((prev) => ({ ...prev, [p.id]: "Подключён" }));
      }, p.connectAfterMs);
      timeouts.push(t1, t2);
    }

    return () => {
      for (const t of timeouts) clearTimeout(t);
      timeoutsRef.current = [];
    };
    // PROVIDERS is module-level; intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col">
      {PROVIDERS.map((p) => (
        <ProviderRow key={p.id} provider={p} stage={stages[p.id] ?? "Подключение"} />
      ))}
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

function ProviderRow({ provider, stage }: { provider: Provider; stage: ProviderStage }) {
  const connected = stage === "Подключён";
  const statusText = connected
    ? `Подключён · ~${formatNumber(provider.finalSignalsPerDay)} сигналов/день`
    : `${stage} · до ${formatNumber(provider.potentialSignalsPerDay)} сигналов/день после подключения`;

  return (
    <div className="flex items-center gap-3 border-t border-border/40 py-2.5 text-sm first:border-t-0">
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          connected ? "bg-emerald-500" : "border border-muted-foreground/60"
        )}
        aria-hidden
      />
      <span className="w-20 shrink-0 font-medium text-foreground">{provider.name}</span>
      <span className="text-muted-foreground">{statusText}</span>
    </div>
  );
}
