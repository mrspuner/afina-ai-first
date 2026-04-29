"use client";

import { useCallback, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import type { Signal } from "@/state/app-state";
import { SCENARIO_TO_TYPE } from "@/state/scenario-map";
import { SurveySection } from "@/sections/survey/survey-section";
import { CampaignWorkspace } from "./campaign-workspace";
import { TopUpModal, computeShortfall } from "./top-up-modal";

const PROCESSING_DURATION_MS = 6000;

/**
 * Lifts step-6 → step-8 control flow out of CampaignWorkspace into the
 * section so that the top-up modal, signal creation, and status transitions
 * can be coordinated against shared app state. Also gates wizard entry on
 * the registration anketa — first-time users go through the survey before
 * the wizard is rendered (smooth handoff, no return to start screen).
 */
export function GuidedSignalSection() {
  const { view, surveyStatus, balance, signals } = useAppState();
  const dispatch = useAppDispatch();
  const initial = view.kind === "guided-signal" ? view.initialScenario : undefined;

  // Survey gate. Held locally so finishing the anketa lets us re-render this
  // same view as the wizard without bouncing through the start screen.
  const [gatePassed, setGatePassed] = useState(surveyStatus === "completed");

  // Pending launch context — we keep the cost/scenario around while the
  // top-up modal is open so a successful payment can flip status → processing
  // automatically without an extra click.
  const [pendingSignalId, setPendingSignalId] = useState<string | null>(null);
  const [pendingCost, setPendingCost] = useState(0);
  const [pendingLabel, setPendingLabel] = useState<string>("");
  const [topUpOpen, setTopUpOpen] = useState(false);

  // Imperative bridge: lets the workspace request "advance to next step" from
  // outside (after modal closes successfully).
  const advanceRef = useRef<() => void>(() => {});

  const startProcessing = useCallback(
    (signalId: string) => {
      dispatch({ type: "signal_status_changed", id: signalId, status: "processing" });
      // Simulate provider work; flip to "ready" after a short delay.
      window.setTimeout(() => {
        dispatch({ type: "signal_status_changed", id: signalId, status: "ready" });
      }, PROCESSING_DURATION_MS);
    },
    [dispatch]
  );

  /** Called by step-6 when the user presses the launch button. */
  const handleLaunchSignal = useCallback(
    (params: {
      scenarioId: string;
      cost: number;
      count: number;
      proceed: () => void;
    }) => {
      const now = new Date().toISOString();
      const id = `sig_${nanoid(8)}`;
      const type = SCENARIO_TO_TYPE[params.scenarioId] ?? "Регистрация";
      const enoughBalance = computeShortfall(balance, params.cost) <= 0;

      const signal: Signal = {
        id,
        type,
        count: params.count,
        segments: { max: 1000, high: 1500, mid: 1200, low: 612 },
        createdAt: now,
        updatedAt: now,
        status: enoughBalance ? "processing" : "awaiting_payment",
      };
      dispatch({ type: "signal_added", signal });
      // signal_added moves view → awaiting-campaign, but page.tsx routes that
      // back to GuidedSignalSection so the workspace's internal step state
      // persists. Track the id so step-7/step-8 can read live status.
      setPendingSignalId(id);
      setPendingCost(params.cost);
      setPendingLabel(`${type} · ${params.count.toLocaleString("ru-RU")}`);

      if (enoughBalance) {
        // Schedule processing → ready transition.
        startProcessing(id);
        params.proceed();
      } else {
        // Open top-up modal; remember context so payment success can resume.
        advanceRef.current = params.proceed;
        setTopUpOpen(true);
      }
    },
    [balance, dispatch, startProcessing]
  );

  const handlePaymentSuccess = useCallback(
    (amount: number) => {
      dispatch({ type: "balance_topup", amount });
      if (pendingSignalId) {
        startProcessing(pendingSignalId);
      }
      setTopUpOpen(false);
      // Keep pendingSignalId so step-7/step-8 can read live status. Auto-
      // advance into the processing screen — no extra click required.
      advanceRef.current();
    },
    [dispatch, pendingSignalId, startProcessing]
  );

  const handleSignalComplete = useCallback(() => {
    dispatch({ type: "signal_complete" });
  }, [dispatch]);

  // Pull the pending signal (if any) so the workspace can read its status
  // for the processing step.
  const pendingSignal = pendingSignalId
    ? signals.find((s) => s.id === pendingSignalId) ?? null
    : null;

  // Survey gate must be after all hooks — React rule.
  if (!gatePassed && surveyStatus !== "completed") {
    return (
      <SurveySection
        // Mandatory at this entry point — spec: skip is only available on
        // first visit (start screen).
        skippable={false}
        onComplete={() => setGatePassed(true)}
      />
    );
  }

  return (
    <>
      <CampaignWorkspace
        onSignalComplete={handleSignalComplete}
        onLaunchRequested={handleLaunchSignal}
        initialScenario={initial}
        pendingSignal={pendingSignal}
      />
      <TopUpModal
        open={topUpOpen}
        onOpenChange={(open) => {
          setTopUpOpen(open);
          // Closing without paying leaves the signal in "awaiting_payment".
          // Keep pendingSignalId so the wizard's step-7 reflects the live
          // status when the workspace advances; user can also find it in the
          // cabinet at any time.
        }}
        balance={balance}
        cost={pendingCost}
        entityLabel={pendingLabel}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
}
