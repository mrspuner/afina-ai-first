"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { WorkflowMiniPreview } from "./workflow-mini-preview";
import { ProviderList } from "./provider-list";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU");
}

export function CampaignScreen() {
  const { view, campaigns, signals } = useAppState();
  const dispatch = useAppDispatch();

  if (view.kind !== "campaign") return null;

  const campaign = campaigns.find((c) => c.id === view.campaign.id);
  const signal = campaign ? signals.find((s) => s.id === campaign.signalId) : undefined;
  const signalType = signal?.type;

  function openWorkflow() {
    if (view.kind !== "campaign") return;
    dispatch({
      type: "open_workflow",
      campaign: view.campaign,
      launched: true,
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pb-promptbar pt-[120px]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        {/* Block 1 — campaign header */}
        <section className="rounded-xl border border-border bg-card p-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {view.campaign.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Коммуникационная · запуск {formatDate(campaign?.launchedAt)} · 150 000 ₽
          </p>
        </section>

        {/* Block 2 — workflow mini preview */}
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Workflow
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <WorkflowMiniPreview signalType={signalType} />
            </div>
            <Button variant="outline" onClick={openWorkflow}>
              Открыть workflow →
            </Button>
          </div>
        </section>

        {/* Block 3 — providers */}
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Провайдеры данных
          </p>
          <ProviderList />
        </section>

        {/* Block 4 — CTA */}
        <Button variant="outline" disabled className="self-start">
          Перейти в статистику
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
