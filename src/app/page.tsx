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

interface SelectedCampaign {
  id: string;
  name: string;
}

export default function Home() {
  const [activeNav,        setActiveNav]        = useState<string | null>(null);
  const [launchOpen,       setLaunchOpen]       = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<SelectedCampaign | null>(null);
  const [workflowLaunched, setWorkflowLaunched] = useState(false);
  const [workflowCommand,  setWorkflowCommand]  = useState<string | null>(null);

  function handleNavChange(nav: string | null) {
    setActiveNav(nav);
    // Reset workflow state when leaving campaigns
    if (nav !== "Кампании") {
      setSelectedCampaign(null);
      setWorkflowLaunched(false);
      setWorkflowCommand(null);
    }
  }

  function handleCampaignSelect(id: string, name: string) {
    setSelectedCampaign({ id, name });
    setWorkflowLaunched(false);
    setWorkflowCommand(null);
  }

  function handlePromptSubmit(message: PromptInputMessage) {
    if (selectedCampaign && !workflowLaunched) {
      setWorkflowCommand(message.text);
    }
  }

  const handleCommandHandled = useCallback(() => {
    setWorkflowCommand(null);
  }, []);

  function handleGoToStats() {
    setActiveNav("Статистика");
    setSelectedCampaign(null);
    setWorkflowLaunched(false);
  }

  const isWorkflow = activeNav === "Кампании" && selectedCampaign !== null;

  // Detect transition into workflow → animate Step 2 badge border green
  const [stepTwoNew, setStepTwoNew] = useState(false);
  const prevIsWorkflow = useRef(false);
  useEffect(() => {
    if (isWorkflow && !prevIsWorkflow.current) {
      setStepTwoNew(true);
      const t = setTimeout(() => setStepTwoNew(false), 1400);
      prevIsWorkflow.current = true;
      return () => clearTimeout(t);
    }
    if (!isWorkflow) {
      prevIsWorkflow.current = false;
    }
  }, [isWorkflow]);

  const welcomeSteps = [
    { n: 1, label: "Получение сигнала",   active: activeNav === null || (activeNav === "Кампании" && !selectedCampaign) },
    { n: 2, label: "Запуск кампании",     active: isWorkflow && !workflowLaunched },
    { n: 3, label: "Статистика кампании", active: workflowLaunched },
  ];

  function renderMain() {
    if (activeNav === null) {
      return <WelcomeView onStep1Click={() => setActiveNav("Кампании")} />;
    }
    if (activeNav === "Статистика") {
      return <StatisticsView />;
    }
    if (activeNav === "Кампании" && selectedCampaign === null) {
      return <CampaignTypeView onSelect={handleCampaignSelect} />;
    }
    if (activeNav === "Кампании" && selectedCampaign !== null) {
      return (
        <WorkflowView
          launched={workflowLaunched}
          pendingCommand={workflowCommand}
          onCommandHandled={handleCommandHandled}
          onGoToStats={handleGoToStats}
        />
      );
    }
    return <CampaignWorkspace />;
  }

  // Derive chat placeholder
  const chatPlaceholder =
    activeNav === null
      ? "Выберите шаг или задайте вопрос…"
      : isWorkflow
      ? "Опишите изменение сценария..."
      : "Опишите вашу кампанию...";

  // Bottom bar hidden during status phase
  const showBottomBar = !workflowLaunched;

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

          {/* Floating group: launch button + chat input + step badges */}
          {showBottomBar && (
            <motion.div
              className="fixed left-[120px] right-0 z-30 px-8"
              initial={false}
              animate={{ bottom: activeNav === null ? "40%" : "3%" }}
              transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">

                {/* Launch button — only in workflow graph mode */}
                {isWorkflow && (
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
                  {welcomeSteps.map(({ n, label, active }) => (
                    <button
                      key={n}
                      type="button"
                      disabled={!active}
                      onClick={
                        n === 1 && active && activeNav === null
                          ? () => setActiveNav("Кампании")
                          : undefined
                      }
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                        active
                          ? "cursor-pointer border-border bg-card hover:bg-accent"
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
                      {active && (
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
