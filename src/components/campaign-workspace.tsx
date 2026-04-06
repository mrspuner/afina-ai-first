"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CampaignStepper } from "@/components/campaign-stepper";
import { StepData, initialStepData } from "@/types/campaign";
import { Step1Scenario } from "@/components/steps/step-1-scenario";
import { Step2Interests } from "@/components/steps/step-2-interests";
import { Step3Segments } from "@/components/steps/step-3-segments";
import { Step4Limit } from "@/components/steps/step-4-limit";
import { Step5Upload } from "@/components/steps/step-5-upload";
import { Step6Summary } from "@/components/steps/step-6-summary";
import { Step7Processing } from "@/components/steps/step-7-processing";
import { Step8Result } from "@/components/steps/step-8-result";

function WorkspaceInner({
  onSignalComplete,
  onStep8Reached,
  initialScenario,
}: {
  onSignalComplete?: () => void;
  onStep8Reached?: (scenarioId: string) => void;
  initialScenario?: { id: string; name: string };
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

  const handleNext = useCallback(
    (partial: Partial<StepData>) => {
      setStepData((prev) => ({ ...prev, ...partial }));
      const next = currentStep + 1;
      if (next > maxStep) {
        setMaxStep(next);
        setAnimatingStep(next);
        setCurrentStep(next);
        if (next === 8) onStep8Reached?.(stepData.scenario ?? "");
      } else {
        setAnimatingStep(null);
        setCurrentStep(next);
      }
      pendingScroll.current = { step: next, behavior: "smooth" };
    },
    [currentStep, maxStep, onStep8Reached]
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

  function renderStepContent(step: number) {
    const props = { data: stepData, onNext: handleNext };
    switch (step) {
      case 1: return <Step1Scenario {...props} />;
      case 2: return <Step2Interests {...props} />;
      case 3: return <Step3Segments {...props} />;
      case 4: return <Step4Limit {...props} />;
      case 5: return <Step5Upload {...props} />;
      case 6: return <Step6Summary {...props} onGoToStep={handleGoToStep} />;
      case 7: return <Step7Processing {...props} />;
      case 8: return <Step8Result data={stepData} onNext={onSignalComplete ? (_p) => onSignalComplete() : handleLaunchNew} />;
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

export function CampaignWorkspace({
  onSignalComplete,
  onStep8Reached,
  initialScenario,
}: {
  onSignalComplete?: () => void;
  onStep8Reached?: (scenarioId: string) => void;
  initialScenario?: { id: string; name: string };
} = {}) {
  return (
    <WorkspaceInner
      onSignalComplete={onSignalComplete}
      onStep8Reached={onStep8Reached}
      initialScenario={initialScenario}
    />
  );
}
