"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import type { Signal } from "@/state/app-state";
import { TopUpModal, computeShortfall } from "./top-up-modal";
import { NewSignalMenu } from "./new-signal-menu";
import { SignalCard } from "./signal-card";
import { SignalsEmptyState } from "./signals-empty-state";
import { UploadSignalDialog } from "./upload-signal-dialog";
import { getProcessingDuration } from "@/state/dev-config";

export function SignalsSection() {
  const { signals, balance, notifications } = useAppState();
  const dispatch = useAppDispatch();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [resumeSignal, setResumeSignal] = useState<Signal | null>(null);

  // Opening the section clears the badge.
  useEffect(() => {
    if (notifications.signalsBadge) {
      dispatch({ type: "signals_badge_set", value: false });
    }
    // Run only on mount of this section to avoid loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(
    () => [...signals].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [signals]
  );

  function handleCreate() {
    dispatch({ type: "start_signal_flow" });
  }

  function handleCreateCampaign(signalId: string) {
    dispatch({ type: "campaign_from_signal", signalId });
  }

  function handleDownload(signalId: string) {
    console.log("download signal", signalId);
  }

  function handleResumeAwaiting(signalId: string) {
    const sig = signals.find((s) => s.id === signalId);
    if (!sig) return;
    setResumeSignal(sig);
  }

  function handleResumeEdit(signalId: string) {
    dispatch({ type: "resume_signal_in_wizard", signalId });
  }

  function handleOpen(signalId: string) {
    dispatch({ type: "resume_signal_in_wizard", signalId });
  }

  function handleDelete(signalId: string) {
    dispatch({ type: "signal_deleted", id: signalId });
  }

  function handleResumePaymentSuccess(amount: number) {
    if (!resumeSignal) return;
    dispatch({ type: "balance_topup", amount });
    dispatch({
      type: "signal_status_changed",
      id: resumeSignal.id,
      status: "processing",
    });
    const id = resumeSignal.id;
    const duration = getProcessingDuration();
    if (Number.isFinite(duration)) {
      window.setTimeout(() => {
        dispatch({ type: "signal_status_changed", id, status: "ready" });
      }, duration);
    }
    setResumeSignal(null);
  }

  // Best-effort cost reconstruction for an existing signal — for the
  // prototype we estimate from total count × cheapest segment price.
  const resumeCost = resumeSignal
    ? Math.max(50, resumeSignal.count * 0.07)
    : 0;
  const resumeShortfall = resumeSignal ? computeShortfall(balance, resumeCost) : 0;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pb-40 pt-[140px]">
      <div className="mx-auto flex w-full max-w-2xl flex-col">
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-[38px] font-semibold leading-[46px] tracking-tight">
            Сигналы
          </h1>
          {signals.length > 0 && (
            <NewSignalMenu onCreate={handleCreate} onUpload={() => setUploadOpen(true)} />
          )}
        </div>

        {signals.length === 0 ? (
          <SignalsEmptyState onCreate={handleCreate} onUpload={() => setUploadOpen(true)} />
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((s, i) => (
              <SignalCard
                key={s.id}
                signal={s}
                index={i}
                onCreateCampaign={handleCreateCampaign}
                onDownload={handleDownload}
                onResumeAwaiting={handleResumeAwaiting}
                onResumeEdit={handleResumeEdit}
                onOpen={s.wizardData ? handleOpen : undefined}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <UploadSignalDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <TopUpModal
        open={resumeSignal !== null}
        onOpenChange={(open) => {
          if (!open) setResumeSignal(null);
        }}
        balance={balance}
        cost={resumeShortfall > 0 ? resumeCost : balance + 1}
        entityLabel={
          resumeSignal
            ? `${resumeSignal.type} · ${resumeSignal.count.toLocaleString("ru-RU")}`
            : undefined
        }
        onPaymentSuccess={handleResumePaymentSuccess}
      />
    </div>
  );
}
