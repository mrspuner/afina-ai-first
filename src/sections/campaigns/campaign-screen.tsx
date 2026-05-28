"use client";

import { ArrowRight, Copy, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EntityCardShell,
  CardTag,
  CardSection,
  type EntityCardAction,
} from "@/components/ui/entity-card";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { WorkflowMiniPreview } from "./workflow-mini-preview";
import { ProviderList } from "./provider-list";
import { StatusBadge } from "./status-badge";
import { scenarioNameForSignal } from "@/state/scenario-display";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU");
}

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

export function CampaignScreen() {
  const { view, campaigns, signals } = useAppState();
  const dispatch = useAppDispatch();

  if (view.kind !== "campaign") return null;

  const campaign = campaigns.find((c) => c.id === view.campaign.id);
  if (!campaign) return null;
  const signal = signals.find((s) => s.id === campaign.signalId);
  const signalType = signal?.type;

  const status = campaign.status;
  const isActive = status === "active";
  const isCompleted = status === "completed";
  const hasStats = isActive || isCompleted;

  const scenarioName =
    campaign.scenario?.name ?? (signal ? scenarioNameForSignal(signal) : "—");

  const metaDate =
    status === "active"
      ? `Запущена ${formatDate(campaign.launchedAt)}`
      : status === "paused"
        ? `Остановлена ${formatDate(campaign.pausedAt)}`
        : status === "completed"
          ? `Завершена ${formatDate(campaign.completedAt)}`
          : `Создана ${formatDate(campaign.createdAt)}`;

  function openWorkflow() {
    dispatch({
      type: "open_workflow",
      campaign: { id: campaign!.id, name: campaign!.name },
      launched: isActive || status === "paused" || isCompleted,
    });
  }

  function launch() {
    if (status === "paused") {
      dispatch({
        type: "campaign_status_changed",
        id: campaign!.id,
        status: "active",
        timestamp: new Date().toISOString(),
      });
    } else {
      dispatch({ type: "open_campaign_payment", campaignId: campaign!.id });
    }
  }

  function stop() {
    dispatch({
      type: "campaign_status_changed",
      id: campaign!.id,
      status: "paused",
      timestamp: new Date().toISOString(),
    });
  }

  const duplicateAction: EntityCardAction = {
    label: "Дублировать",
    onClick: () => dispatch({ type: "campaign_duplicated", id: campaign.id }),
    icon: <Copy className="h-4 w-4" />,
  };

  const secondaryActions: EntityCardAction[] = isActive
    ? [
        {
          label: "Остановить",
          onClick: stop,
          icon: <Square className="h-4 w-4" />,
        },
        duplicateAction,
      ]
    : [duplicateAction];

  return (
    <EntityCardShell
      title={campaign.name}
      onRename={(name) =>
        dispatch({ type: "campaign_renamed", id: campaign.id, name })
      }
      badge={<StatusBadge status={status} />}
      tags={
        <>
          <CardTag>Сценарий: {scenarioName}</CardTag>
          {signal && (
            <CardTag>
              Сигнал: {signal.type} · {formatNumber(signal.count)}
            </CardTag>
          )}
        </>
      }
      meta={metaDate}
      secondaryActions={secondaryActions}
    >
      {/* Workflow */}
      <CardSection label="Workflow">
        <WorkflowMiniPreview signalType={signalType} onClick={openWorkflow} />
      </CardSection>

      {/* Providers (active) or launch CTA (otherwise) */}
      {isActive ? (
        <CardSection label="Провайдеры данных">
          <ProviderList />
        </CardSection>
      ) : isCompleted ? (
        <CardSection label="Статус">
          <p className="text-sm text-muted-foreground">
            Кампания завершена. Дублируйте её, чтобы запустить новый прогон или
            A-B-тест.
          </p>
        </CardSection>
      ) : (
        <CardSection label="Запуск">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {status === "paused"
                ? "Кампания остановлена. Возобновите её, чтобы снова подключить провайдеров."
                : "Запустите кампанию — провайдеры начнут подключаться после оплаты."}
            </p>
            <Button onClick={launch} className="gap-2 self-start">
              <Play className="h-4 w-4" />
              Запустить
            </Button>
          </div>
        </CardSection>
      )}

      {/* Stats link */}
      {hasStats && (
        <Button
          variant="outline"
          className="self-start gap-2"
          onClick={() => dispatch({ type: "goto_stats", campaignId: campaign.id })}
        >
          Перейти в статистику
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </EntityCardShell>
  );
}
