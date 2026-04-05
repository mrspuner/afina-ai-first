"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import { Mic } from "lucide-react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputProvider,
} from "@/components/ai-elements/prompt-input";
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

function WorkspaceInner() {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [animatingStep, setAnimatingStep] = useState<number | null>(1);
  const [stepData, setStepData] = useState<StepData>(initialStepData);
  const stepRefs = useRef<Record<number, HTMLDivElement | null>>({});

  function scrollToStep(step: number, behavior: ScrollBehavior = "smooth") {
    stepRefs.current[step]?.scrollIntoView({ behavior, block: "start" });
  }

  const handleNext = useCallback(
    (partial: Partial<StepData>) => {
      setStepData((prev) => ({ ...prev, ...partial }));
      const next = currentStep + 1;
      if (next > maxStep) {
        // First time reaching this step — animate it in
        setMaxStep(next);
        setAnimatingStep(next);
        setCurrentStep(next);
        requestAnimationFrame(() => scrollToStep(next, "smooth"));
      } else {
        // Returning scenario — step already rendered, just scroll
        setAnimatingStep(null);
        setCurrentStep(next);
        requestAnimationFrame(() => scrollToStep(next, "smooth"));
      }
    },
    [currentStep, maxStep]
  );

  const handleStepperClick = useCallback((step: number) => {
    setAnimatingStep(null);
    setCurrentStep(step);
    requestAnimationFrame(() => scrollToStep(step, "instant"));
  }, []);

  const handleGoToStep = useCallback((step: number) => {
    setAnimatingStep(null);
    setCurrentStep(step);
    requestAnimationFrame(() => scrollToStep(step, "smooth"));
  }, []);

  const handleLaunchNew = useCallback(() => {
    setStepData(initialStepData);
    setCurrentStep(1);
    setMaxStep(1);
    setAnimatingStep(1);
    requestAnimationFrame(() => scrollToStep(1, "instant"));
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
      case 8: return <Step8Result data={stepData} onNext={handleLaunchNew} />;
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

      {/* Scrollable step column */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {visibleSteps.map((step) => (
          <motion.div
            key={step}
            ref={(el) => { stepRefs.current[step] = el; }}
            initial={step === animatingStep ? { y: 60, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex min-h-screen flex-col items-center justify-center px-8 py-10"
          >
            {renderStepContent(step)}
          </motion.div>
        ))}
      </div>

      {/* Chat input — pinned to bottom */}
      <div className="border-t border-border bg-background px-8 py-4">
        <div className="mx-auto w-full max-w-2xl">
          <PromptInput
            onSubmit={(msg) => {
              console.log("chat submit", msg);
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea placeholder="Опишите вашу кампанию..." />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputButton tooltip="Голосовой ввод">
                  <Mic className="h-4 w-4" />
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

export function CampaignWorkspace() {
  return (
    <PromptInputProvider>
      <WorkspaceInner />
    </PromptInputProvider>
  );
}
