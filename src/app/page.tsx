// src/app/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Mic, ChevronRight } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { CampaignWorkspace } from "@/components/campaign-workspace";
import { StatisticsView } from "@/components/statistics-view";
import { LaunchFlyout } from "@/components/launch-flyout";
import { WelcomeView } from "@/components/welcome-view";
import { CampaignTypeView } from "@/components/campaign-type-view";
import { SignalTypeView } from "@/components/signal-type-view";
import { WorkflowView } from "@/components/workflow-view";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";

// "signal"            — guided signal collection flow (CampaignWorkspace)
// "awaiting-campaign" — signal done, step 2 badge active, waiting for user to click it
// "campaign"          — campaign type selected or in workflow
type FlowPhase = "signal" | "awaiting-campaign" | "campaign" | null;

interface SelectedCampaign {
  id: string;
  name: string;
}

export default function Home() {
  const [activeNav,        setActiveNav]        = useState<string | null>(null);
  const [launchOpen,       setLaunchOpen]       = useState(false);
  const [flowPhase,        setFlowPhase]        = useState<FlowPhase>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<SelectedCampaign | null>(null);
  const [workflowLaunched, setWorkflowLaunched] = useState(false);
  const [workflowCommand,  setWorkflowCommand]  = useState<string | null>(null);

  // Sidebar navigation — exits guided flow, goes to standalone section
  function handleNavChange(nav: string) {
    setActiveNav(nav);
    setFlowPhase(null);
    setSelectedCampaign(null);
    setWorkflowLaunched(false);
    setWorkflowCommand(null);
  }

  // Welcome Step 1 badge → start guided signal flow
  function handleStep1Click() {
    setActiveNav(null);
    setFlowPhase("signal");
  }

  // Step 8 activates (counter shows) → animate Step 2 badge
  function handleStep8Reached() {
    setFlowPhase("awaiting-campaign");
  }

  // Step 8 "Запустить кампанию" button → go to campaign selection
  function handleSignalComplete() {
    setFlowPhase("campaign");
  }

  // Step 2 badge clicked → open campaign type selection
  function handleStep2Click() {
    setFlowPhase("campaign");
  }

  // Campaign type selected
  function handleCampaignSelect(id: string, name: string) {
    setSelectedCampaign({ id, name });
    setFlowPhase("campaign");
    setWorkflowLaunched(false);
    setWorkflowCommand(null);
  }

  const handleCommandHandled = useCallback(() => {
    setWorkflowCommand(null);
  }, []);

  function handleGoToStats() {
    setActiveNav("Статистика");
    setFlowPhase(null);
    setSelectedCampaign(null);
    setWorkflowLaunched(false);
  }

  function handlePromptSubmit(message: PromptInputMessage) {
    if (flowPhase === "campaign" && selectedCampaign && !workflowLaunched) {
      setWorkflowCommand(message.text);
    }
  }

  const isWorkflow = flowPhase === "campaign" && selectedCampaign !== null;

  // Step 2 badge pulse — triggers when signal collection completes
  const [stepTwoNew, setStepTwoNew] = useState(false);
  const prevFlowPhase = useRef<FlowPhase>(null);
  useEffect(() => {
    if (flowPhase === "awaiting-campaign" && prevFlowPhase.current !== "awaiting-campaign") {
      setStepTwoNew(true);
      const t = setTimeout(() => setStepTwoNew(false), 1400);
      prevFlowPhase.current = flowPhase;
      return () => clearTimeout(t);
    }
    prevFlowPhase.current = flowPhase;
  }, [flowPhase]);

  const onWelcome   = flowPhase === null && activeNav === null;
  const step1Active = onWelcome || flowPhase === "signal";
  const step2Active = flowPhase === "awaiting-campaign" || (flowPhase === "campaign" && !workflowLaunched);
  const step3Active = workflowLaunched;

  function renderMain() {
    // Guided signal flow (CampaignWorkspace persists through awaiting-campaign so step 8 stays visible)
    if (flowPhase === "signal" || flowPhase === "awaiting-campaign") {
      return <CampaignWorkspace onSignalComplete={handleSignalComplete} onStep8Reached={handleStep8Reached} />;
    }
    // Guided campaign flow
    if (flowPhase === "campaign" && !selectedCampaign) {
      return <CampaignTypeView onSelect={handleCampaignSelect} />;
    }
    if (flowPhase === "campaign" && selectedCampaign) {
      return (
        <WorkflowView
          launched={workflowLaunched}
          pendingCommand={workflowCommand}
          onCommandHandled={handleCommandHandled}
          onGoToStats={handleGoToStats}
        />
      );
    }
    // Direct sidebar sections
    if (activeNav === "Статистика") return <StatisticsView />;
    if (activeNav === "Сигналы")    return <SignalTypeView onCreateSignal={handleStep1Click} />;
    if (activeNav === "Кампании")   return <CampaignTypeView onSelect={handleCampaignSelect} />;
    // Welcome
    return <WelcomeView onStep1Click={handleStep1Click} />;
  }

  const chatPlaceholder =
    isWorkflow              ? "Опишите изменение сценария..." :
    flowPhase === "campaign"? "Опишите вашу кампанию..."      :
                              "Выберите шаг или задайте вопрос…";

  const showBottomBar = true;
  const floatBottom   = onWelcome ? "40%" : "3%";

  return (
    <PromptInputProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar
          activeNav={activeNav ?? undefined}
          onNavChange={handleNavChange}
          onLaunchOpen={() => setLaunchOpen(true)}
          flyoutOpen={launchOpen}
        />
        <LaunchFlyout open={launchOpen} onClose={() => setLaunchOpen(false)} />

        <div className="relative flex flex-1 flex-col overflow-hidden">
          {renderMain()}

          {showBottomBar && (
            <motion.div
              className="fixed left-[120px] right-0 z-30 px-8"
              initial={false}
              animate={{ bottom: floatBottom }}
              transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">

                {/* Launch button — only while editing the workflow graph */}
                {isWorkflow && !workflowLaunched && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setWorkflowLaunched(true)}
                      className="rounded-lg bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                    >
                      Начать кампанию →
                    </button>
                  </div>
                )}

                <PromptInput onSubmit={handlePromptSubmit}>
                  <PromptInputBody>
                    <PromptInputTextarea placeholder={chatPlaceholder} />
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

                {/* Step badges */}
                <div className="flex gap-2">
                  {([
                    { n: 1, label: "Получение сигнала",   active: step1Active, onClick: onWelcome ? handleStep1Click : undefined },
                    { n: 2, label: "Запуск кампании",     active: step2Active, onClick: flowPhase === "awaiting-campaign" ? handleStep2Click : undefined },
                    { n: 3, label: "Статистика кампании", active: step3Active, onClick: undefined },
                  ] as const).map(({ n, label, active, onClick }) => (
                    <button
                      key={n}
                      type="button"
                      disabled={!active}
                      onClick={onClick}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                        active
                          ? onClick
                            ? "cursor-pointer border-border bg-card hover:bg-accent"
                            : "cursor-default border-border bg-card"
                          : "cursor-not-allowed border-border/40 bg-card/40 opacity-35"
                      )}
                      style={
                        stepTwoNew && n === 2
                          ? { animation: "step-badge-pulse 1.4s ease-in-out" }
                          : undefined
                      }
                    >
                      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                        Шаг {n}
                      </span>
                      <div className="h-3 w-px shrink-0 bg-border" />
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      {active && onClick && (
                        <ChevronRight className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>

                <style>{`
                  @keyframes step-badge-pulse {
                    0%, 100% { border-color: #1e1e1e; box-shadow: none; }
                    20%, 60% { border-color: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.35); }
                    40%, 80% { border-color: #1e1e1e; box-shadow: none; }
                  }
                `}</style>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PromptInputProvider>
  );
}
