"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { TopUpModal, computeShortfall } from "@/sections/signals/top-up-modal";
import { cn } from "@/lib/utils";
import {
  estimateTouches,
  recommendCampaignBudget,
} from "./campaign-payment-math";

type Mode = "recommended" | "custom";

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

function formatRub(n: number): string {
  return `₽ ${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}`;
}

export function CampaignPaymentScreen() {
  const { view, campaigns, signals, balance } = useAppState();
  const dispatch = useAppDispatch();

  // Hook order is fixed across renders: we always call hooks unconditionally
  // and bail to a fallback render below if view/campaign aren't right.
  const campaignFromView =
    view.kind === "campaign-payment" ? view.campaign : null;

  const campaign = campaignFromView
    ? campaigns.find((c) => c.id === campaignFromView.id) ?? null
    : null;
  const signal = campaign
    ? signals.find((s) => s.id === campaign.signalId) ?? null
    : null;
  const audienceSize = signal?.count ?? 0;

  // Cache the recommended value once per mount — Math.random would otherwise
  // jump on every render. Same convention as step-5-limit.tsx.
  const recommended = useMemo(
    () => recommendCampaignBudget(audienceSize),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [mode, setMode] = useState<Mode>("recommended");
  const [customValue, setCustomValue] = useState<string>(
    recommended > 0 ? String(recommended) : ""
  );
  const customInputRef = useRef<HTMLInputElement | null>(null);

  const customParsed = parseFloat(customValue.replace(",", "."));
  const customIsValid = !isNaN(customParsed) && customParsed > 0;
  const activeBudget =
    mode === "recommended" ? recommended : customIsValid ? customParsed : 0;

  const touches = estimateTouches(activeBudget, audienceSize);
  const shortfall = computeShortfall(balance, activeBudget);
  const enoughBalance = shortfall <= 0;

  const [topUpOpen, setTopUpOpen] = useState(false);
  // Local "launching" state: when set, swap form for the launch animation.
  // The actual campaign_launched dispatch fires after the animation completes,
  // so the user sees feedback before being navigated to CampaignScreen.
  const [launching, setLaunching] = useState(false);
  const launchPayloadRef = useRef<{ id: string; budget: number } | null>(null);

  function handleBack() {
    if (!campaign) return;
    dispatch({
      type: "open_workflow",
      campaign: { id: campaign.id, name: campaign.name },
      launched: false,
    });
  }

  function startLaunchAnimation(campaignId: string, budget: number) {
    launchPayloadRef.current = { id: campaignId, budget };
    setLaunching(true);
  }

  function handleLaunch() {
    if (!campaign) return;
    if (activeBudget <= 0) return;
    if (!enoughBalance) {
      setTopUpOpen(true);
      return;
    }
    startLaunchAnimation(campaign.id, activeBudget);
  }

  function handleTopUpSuccess(amount: number) {
    if (!campaign) return;
    dispatch({ type: "balance_topup", amount });
    setTopUpOpen(false);
    startLaunchAnimation(campaign.id, activeBudget);
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setCustomValue(raw);
  }

  function selectCustom() {
    setMode("custom");
    window.requestAnimationFrame(() => customInputRef.current?.focus());
  }

  // Fallback render (view mismatch or campaign vanished). Keeps hooks order
  // stable — early return must not skip any hook.
  if (view.kind !== "campaign-payment" || !campaign) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Кампания не найдена.
      </div>
    );
  }

  if (launching) {
    return (
      <LaunchAnimation
        onDone={() => {
          const payload = launchPayloadRef.current;
          if (!payload) return;
          dispatch({
            type: "campaign_launched",
            id: payload.id,
            timestamp: new Date().toISOString(),
            budget: payload.budget,
          });
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pb-promptbar pt-[120px]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        {/* Header — back button + campaign name */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={handleBack}
            aria-label="Назад"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {campaign.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Оплата запуска кампании
            </p>
          </div>
        </div>

        {/* Budget cards — mirror of step-5-limit.tsx */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("recommended")}
            disabled={recommended <= 0}
            className={cn(
              "relative flex h-[140px] flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              mode === "recommended"
                ? "border-brand/60 bg-brand-muted"
                : "border-border bg-card hover:bg-accent/50",
              recommended <= 0 && "cursor-not-allowed opacity-50"
            )}
          >
            <RadioDot active={mode === "recommended"} />
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-widest",
                mode === "recommended"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Рекомендуемая
            </span>
            <span
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                mode === "recommended"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {recommended > 0 ? formatRub(recommended) : "—"}
            </span>
            <span className="mt-auto text-xs text-muted-foreground">
              На основе размера аудитории
            </span>
          </button>

          <button
            type="button"
            onClick={selectCustom}
            className={cn(
              "relative flex h-[140px] flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              mode === "custom"
                ? "border-brand/60 bg-brand-muted"
                : "border-border bg-card hover:bg-accent/50"
            )}
          >
            <RadioDot active={mode === "custom"} />
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-widest",
                mode === "custom"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              Своя сумма
            </span>
            <div
              className="relative mt-1 w-full"
              onClick={(e) => {
                if (mode === "custom") e.stopPropagation();
              }}
            >
              <Input
                ref={customInputRef}
                type="text"
                inputMode="decimal"
                placeholder="Например, 500"
                value={customValue}
                onChange={handleCustomChange}
                disabled={mode !== "custom"}
                className={cn(
                  "pr-8 text-lg tabular-nums",
                  mode !== "custom" && "cursor-pointer"
                )}
                aria-label="Своя сумма"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                ₽
              </span>
            </div>
            <span className="mt-auto text-xs text-muted-foreground">
              Введите свою сумму
            </span>
          </button>
        </div>

        {/* Touches forecast */}
        <p className="text-sm text-muted-foreground">
          Прогноз касаний:{" "}
          <span className="font-medium text-foreground">
            {touches > 0 ? formatNumber(touches) : "—"}
          </span>
        </p>

        {/* Cost / Balance — mirror of step-6-summary.tsx */}
        <div
          className={cn(
            "rounded-lg border bg-card px-4 py-3.5",
            enoughBalance
              ? "border-border"
              : "border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5"
          )}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Стоимость</span>
            <span className="font-semibold tabular-nums">
              {formatRub(activeBudget)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Баланс</span>
            <span className="font-medium tabular-nums">{formatRub(balance)}</span>
          </div>
          {!enoughBalance && (
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
              <span className="text-foreground">Не хватает</span>
              <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {formatRub(shortfall)}
              </span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-start">
          <Button
            onClick={handleLaunch}
            disabled={activeBudget <= 0}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {enoughBalance ? "Запустить" : "Пополнить и запустить"}
          </Button>
        </div>
      </div>

      <TopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        balance={balance}
        cost={activeBudget}
        entityLabel={campaign.name}
        onPaymentSuccess={handleTopUpSuccess}
      />
    </div>
  );
}

function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute right-3 top-3 h-3 w-3 rounded-full border-2 transition-colors",
        active
          ? "border-foreground bg-foreground"
          : "border-border bg-transparent"
      )}
    />
  );
}

const LAUNCH_DURATION = 1600;

function LaunchAnimation({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), LAUNCH_DURATION);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-promptbar pt-[120px]">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Запускаем кампанию
        </h1>
      </div>
    </div>
  );
}
