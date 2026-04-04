"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
import { StepData, initialStepData } from "@/types/campaign";

// Step components — imported one by one as they are built
// import { Step1Scenario } from "@/components/steps/step-1-scenario";

function WorkspaceInner() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState<StepData>(initialStepData);

  function handleNext(partial: Partial<StepData>) {
    setStepData((prev) => ({ ...prev, ...partial }));
    setCurrentStep((prev) => prev + 1);
  }

  function handleStepperClick(step: number) {
    setCurrentStep(step);
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return <div className="text-muted-foreground">Step 1 placeholder</div>;
      default:
        return <div className="text-muted-foreground">Step {currentStep} placeholder</div>;
    }
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Stepper — rendered from step 2 onward (added in Task 4) */}

      {/* Animated step area */}
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-8 py-10"
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeIn" }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Chat input — pinned to bottom, outside animation */}
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
