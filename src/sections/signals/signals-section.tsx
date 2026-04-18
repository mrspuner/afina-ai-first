"use client";

import { useMemo, useState } from "react";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { NewSignalMenu } from "./new-signal-menu";
import { SignalCard } from "./signal-card";
import { SignalsEmptyState } from "./signals-empty-state";
import { UploadSignalDialog } from "./upload-signal-dialog";

export function SignalsSection() {
  const { signals } = useAppState();
  const dispatch = useAppDispatch();
  const [uploadOpen, setUploadOpen] = useState(false);

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
            {sorted.map((s) => (
              <SignalCard
                key={s.id}
                signal={s}
                onCreateCampaign={handleCreateCampaign}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </div>

      <UploadSignalDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
