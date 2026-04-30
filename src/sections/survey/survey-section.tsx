"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useAppDispatch } from "@/state/app-state-context";
import type { Survey } from "@/types/survey";

import { SurveyAwaiting } from "./survey-awaiting";
import { SurveyForm } from "./survey-form";

type Phase =
  | { kind: "form" }
  | { kind: "awaiting"; survey: Survey };

interface SurveySectionProps {
  // First-visit entry can offer "Пропустить"; gate before the wizard cannot.
  skippable: boolean;
  // Called once the awaiting (mock LLM) screen finishes. Caller is expected
  // to navigate the user onward (e.g. into the wizard) — keeps the survey
  // unaware of the next route.
  onComplete: () => void;
  // Optional: invoked on skip. Required iff `skippable`.
  onSkip?: () => void;
  title?: string;
  subtitle?: string;
}

export function SurveySection({
  skippable,
  onComplete,
  onSkip,
  title,
  subtitle,
}: SurveySectionProps) {
  const dispatch = useAppDispatch();
  const [phase, setPhase] = useState<Phase>({ kind: "form" });

  function handleSubmit(survey: Survey) {
    setPhase({ kind: "awaiting", survey });
  }

  function handleSkip() {
    if (!skippable) return;
    dispatch({ type: "survey_skipped" });
    onSkip?.();
  }

  function handleAwaitingDone() {
    if (phase.kind !== "awaiting") return;
    dispatch({ type: "survey_completed", survey: phase.survey });
    // Hand off to caller — keeps the transition smooth: the next view replaces
    // this one without a flicker through the start screen.
    onComplete();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-8 pb-16 pt-[120px]">
      <AnimatePresence mode="wait">
        {phase.kind === "form" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex w-full justify-center"
          >
            <SurveyForm
              skippable={skippable}
              onSubmit={handleSubmit}
              onSkip={skippable ? handleSkip : undefined}
              title={title}
              subtitle={subtitle}
            />
          </motion.div>
        ) : (
          <motion.div
            key="awaiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex w-full justify-center"
          >
            <SurveyAwaiting
              onDone={handleAwaitingDone}
              websiteHostname={hostnameFor(phase.survey.companyWebsite)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function hostnameFor(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
