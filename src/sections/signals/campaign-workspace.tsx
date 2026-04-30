"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CampaignStepper } from "@/sections/signals/campaign-stepper";
import { StepData, initialStepData } from "@/types/campaign";
import { Step1Scenario } from "@/sections/signals/steps/step-1-scenario";
import { Step2Interests } from "@/sections/signals/steps/step-2-interests";
import { Step3Segments } from "@/sections/signals/steps/step-3-segments";
import { Step4Upload } from "@/sections/signals/steps/step-4-upload";
import { Step5Limit } from "@/sections/signals/steps/step-5-limit";
import { Step6Summary } from "@/sections/signals/steps/step-6-summary";
import { Step7Processing } from "@/sections/signals/steps/step-7-processing";
import { Step8Result } from "@/sections/signals/steps/step-8-result";
import type { Signal } from "@/state/app-state";

export interface LaunchRequest {
  scenarioId: string;
  cost: number;
  count: number;
  proceed: () => void;
}

function WorkspaceInner({
  onSignalComplete,
  onLaunchRequested,
  initialScenario,
  pendingSignal,
}: {
  onSignalComplete?: () => void;
  onLaunchRequested?: (req: LaunchRequest) => void;
  initialScenario?: { id: string; name: string };
  pendingSignal?: Signal | null;
}) {
  const startStep = initialScenario ? 2 : 1;
  const [currentStep, setCurrentStep] = useState(startStep);
  const [maxStep, setMaxStep] = useState(startStep);
  const [animatingStep, setAnimatingStep] = useState<number | null>(startStep);
  const [stepData, setStepData] = useState<StepData>(
    initialScenario
      ? { ...initialStepData, scenario: initialScenario.id }
      : initialStepData
  );
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pendingScroll = useRef<{ step: number; behavior: ScrollBehavior } | null>(null);

  function scrollToStep(step: number, behavior: ScrollBehavior = "smooth") {
    stepRefs.current[step]?.scrollIntoView({ behavior, block: "start" });
  }

  // Runs after every commit — guaranteed the new step's DOM node exists
  useEffect(() => {
    if (!pendingScroll.current) return;
    const { step, behavior } = pendingScroll.current;
    pendingScroll.current = null;
    scrollToStep(step, behavior);
  });

  const advanceTo = useCallback((next: number) => {
    setMaxStep((m) => Math.max(m, next));
    setAnimatingStep(next);
    setCurrentStep(next);
    pendingScroll.current = { step: next, behavior: "smooth" };
  }, []);

  const handleNext = useCallback(
    (partial: Partial<StepData>) => {
      setStepData((prev) => ({ ...prev, ...partial }));
      // Revisited earlier step: keep filled progress, jump back to the
      // furthest reached step instead of advancing linearly.
      if (currentStep < maxStep) {
        setAnimatingStep(null);
        setCurrentStep(maxStep);
        pendingScroll.current = { step: maxStep, behavior: "smooth" };
        return;
      }
      const next = currentStep + 1;
      advanceTo(next);
    },
    [advanceTo, currentStep, maxStep]
  );

  const handleStepperClick = useCallback((step: number) => {
    setAnimatingStep(null);
    setCurrentStep(step);
    pendingScroll.current = { step, behavior: "instant" };
  }, []);

  const handleGoToStep = useCallback((step: number) => {
    setAnimatingStep(null);
    setCurrentStep(step);
    pendingScroll.current = { step, behavior: "smooth" };
  }, []);

  const handleLaunchNew = useCallback(() => {
    setStepData(initialStepData);
    setCurrentStep(1);
    setMaxStep(1);
    setAnimatingStep(1);
    pendingScroll.current = { step: 1, behavior: "instant" };
  }, []);

  // Step 6 launch handoff — tells the section to create the signal & maybe
  // open the top-up modal. The proceed callback advances the workspace to
  // step 7 once the section is ready (immediately if balance ≥ cost,
  // post-payment otherwise).
  const handleLaunchFromSummary = useCallback(() => {
    if (!onLaunchRequested) {
      // Fallback: just advance.
      handleNext({});
      return;
    }
    onLaunchRequested({
      scenarioId: stepData.scenario ?? "",
      cost: stepData.budget ?? 0,
      // Estimated count — derived in step-6 from budget + cheapest segment.
      count: estimateSignalCount(stepData),
      proceed: () => advanceTo(7),
    });
  }, [advanceTo, handleNext, onLaunchRequested, stepData]);

  function renderStepContent(step: number) {
    const props = { data: stepData, onNext: handleNext };
    switch (step) {
      case 1: return <Step1Scenario {...props} />;
      case 2: return <Step2Interests {...props} />;
      case 3: return <Step3Segments {...props} />;
      case 4: return <Step4Upload {...props} />;
      case 5: return <Step5Limit {...props} />;
      case 6:
        return (
          <Step6Summary
            {...props}
            onGoToStep={handleGoToStep}
            onNext={() => handleLaunchFromSummary()}
          />
        );
      case 7:
        return (
          <Step7Processing
            {...props}
            signal={pendingSignal ?? null}
            onAdvance={() => advanceTo(8)}
          />
        );
      case 8:
        return (
          <Step8Result
            data={stepData}
            signal={pendingSignal ?? null}
            onUseInCampaign={onSignalComplete ?? handleLaunchNew}
          />
        );
      default: return null;
    }
  }

  const visibleSteps = Array.from({ length: maxStep }, (_, i) => i + 1);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {currentStep >= 2 && (
        <div className="absolute right-6 top-6 z-10">
          <CampaignStepper
            currentStep={currentStep}
            maxStep={maxStep}
            onStepClick={handleStepperClick}
            disabled={currentStep === 7}
          />
        </div>
      )}

      {/* Scrollable step column — extra bottom padding so content clears the floating input */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {visibleSteps.map((step) => (
          <motion.div
            key={step}
            ref={(el) => { stepRefs.current[step] = el; }}
            initial={step === animatingStep ? { y: 60, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex min-h-screen flex-col items-center justify-center px-8 pb-40 pt-10"
          >
            {renderStepContent(step)}
          </motion.div>
        ))}
      </div>

    </div>
  );
}

const SEGMENT_PRICES: Record<string, number> = {
  max: 0.45,
  "very-high": 0.35,
  high: 0.25,
  medium: 0.07,
};

function estimateSignalCount(data: StepData): number {
  const budget = data.budget ?? 0;
  const prices = data.segments
    .map((s) => SEGMENT_PRICES[s] ?? 0)
    .filter(Boolean);
  if (!prices.length || !budget) return 0;
  const cheapest = Math.min(...prices);
  return Math.floor(budget / cheapest);
}

export function CampaignWorkspace({
  onSignalComplete,
  onLaunchRequested,
  initialScenario,
  pendingSignal,
}: {
  onSignalComplete?: () => void;
  onLaunchRequested?: (req: LaunchRequest) => void;
  initialScenario?: { id: string; name: string };
  pendingSignal?: Signal | null;
} = {}) {
  return (
    <WorkspaceInner
      onSignalComplete={onSignalComplete}
      onLaunchRequested={onLaunchRequested}
      initialScenario={initialScenario}
      pendingSignal={pendingSignal}
    />
  );
}
