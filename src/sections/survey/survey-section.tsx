"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useAppDispatch } from "@/state/app-state-context";
import type { Survey } from "@/types/survey";

import { SurveyAwaiting } from "./survey-awaiting";
import { SurveyForm } from "./survey-form";
import { OnboardingInterestsScreen } from "./onboarding-interests-screen";
import { OnboardingScenariosScreen } from "./onboarding-scenarios-screen";

type Phase =
  | { kind: "form" }
  | { kind: "awaiting"; survey: Survey }
  | { kind: "interests"; survey: Survey }
  | { kind: "scenarios"; survey: Survey };

interface SurveySectionProps {
  // Called once the user finishes onboarding. The first-visit flow opens the
  // scenario catalog from inside this section; gate-mode flows just need the
  // user handed off to the wizard. The caller decides what to do next.
  onComplete: () => void;
  // When true, run the full 3-screen onboarding (form → enrich → interests →
  // scenarios → caller). When false (legacy gate before the wizard), stop
  // after the enrich animation and hand off to the wizard.
  withOnboardingScreens?: boolean;
  title?: string;
  subtitle?: string;
}

export function SurveySection({
  onComplete,
  withOnboardingScreens = false,
  title,
  subtitle,
}: SurveySectionProps) {
  const dispatch = useAppDispatch();
  const [phase, setPhase] = useState<Phase>({ kind: "form" });

  function handleSubmit(survey: Survey) {
    setPhase({ kind: "awaiting", survey });
  }

  function handleAwaitingDone() {
    if (phase.kind !== "awaiting") return;
    if (withOnboardingScreens) {
      setPhase({ kind: "interests", survey: phase.survey });
      return;
    }
    dispatch({ type: "survey_completed", survey: phase.survey });
    onComplete();
  }

  function handleInterestsContinue() {
    if (phase.kind !== "interests") return;
    setPhase({ kind: "scenarios", survey: phase.survey });
  }

  function handleChooseScenario() {
    if (phase.kind !== "scenarios") return;
    dispatch({ type: "survey_completed", survey: phase.survey });
    dispatch({ type: "catalog_open", returnTo: "onboarding" });
    onComplete();
  }

  return (
    <div className="flex flex-1 items-center justify-center px-8 pb-16 pt-[120px]">
      <AnimatePresence mode="wait">
        {phase.kind === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="flex w-full justify-center"
          >
            <SurveyForm
              onSubmit={handleSubmit}
              title={title}
              subtitle={subtitle}
            />
          </motion.div>
        )}
        {phase.kind === "awaiting" && (
          <motion.div
            key="awaiting"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="flex w-full justify-center"
          >
            <SurveyAwaiting
              onDone={handleAwaitingDone}
              websiteHostname={hostnameFor(phase.survey.companyWebsite)}
            />
          </motion.div>
        )}
        {phase.kind === "interests" && (
          <motion.div
            key="interests"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="flex w-full justify-center"
          >
            <OnboardingInterestsScreen onContinue={handleInterestsContinue} />
          </motion.div>
        )}
        {phase.kind === "scenarios" && (
          <motion.div
            key="scenarios"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="flex w-full justify-center"
          >
            <OnboardingScenariosScreen onChooseScenario={handleChooseScenario} />
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
