"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import type { Signal } from "@/state/app-state";
import { SCENARIO_TO_TYPE } from "@/state/scenario-map";
import { SurveySection } from "@/sections/survey/survey-section";
import { CampaignWorkspace } from "./campaign-workspace";

export function GuidedSignalSection() {
  const { view, surveyStatus } = useAppState();
  const dispatch = useAppDispatch();
  const initial = view.kind === "guided-signal" ? view.initialScenario : undefined;

  // Per spec: when surveyStatus !== "completed" and the user enters the
  // wizard, route through the survey first, then transition smoothly into
  // the wizard. We hold the gate locally so that finishing the survey lets
  // us re-render this same view as the wizard — no return to start screen.
  const [gatePassed, setGatePassed] = useState(surveyStatus === "completed");

  if (!gatePassed && surveyStatus !== "completed") {
    return (
      <SurveySection
        // Mandatory at this entry point — spec: skip is only available on
        // first visit (welcome screen, owned by another worktree).
        skippable={false}
        onComplete={() => setGatePassed(true)}
      />
    );
  }

  return (
    <CampaignWorkspace
      onSignalComplete={() => dispatch({ type: "signal_complete" })}
      onStep8Reached={(scenarioId) => {
        const now = new Date().toISOString();
        const signal: Signal = {
          id: `sig_${nanoid(8)}`,
          type: SCENARIO_TO_TYPE[scenarioId] ?? "Регистрация",
          count: 4312,
          segments: { max: 1000, high: 1500, mid: 1200, low: 612 },
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: "signal_added", signal });
      }}
      initialScenario={initial}
    />
  );
}
