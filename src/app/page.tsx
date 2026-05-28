"use client";

import { AnimatePresence, motion } from "motion/react";
import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { PromptChipsProvider } from "@/state/prompt-chips-context";
import { ChatProvider } from "@/state/chat-context";
import { TriggerEditRegistryProvider } from "@/state/trigger-edit-context";
import { DraftQueueProvider } from "@/state/draft-queue-context";
import { ChatPanel } from "@/sections/shell/chat-panel";
import { ChatDrawer } from "@/sections/shell/chat-drawer";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { useChat } from "@/state/chat-context";
import { AppSidebar } from "@/sections/shell/app-sidebar";
import { LaunchFlyout } from "@/sections/shell/launch-flyout";
import { ShellBottomBar } from "@/sections/shell/shell-bottom-bar";
import { WelcomeSection } from "@/sections/welcome/welcome-section";
import { SurveySection } from "@/sections/survey/survey-section";
import { WelcomeChatProvider } from "@/sections/welcome/welcome-chat-context";
import { useOnboardingChat } from "@/sections/welcome/use-onboarding-chat";
import { GuidedSignalSection } from "@/sections/signals/guided-signal-section";
import { SignalsSection } from "@/sections/signals/signals-section";
import { CampaignsSection } from "@/sections/campaigns/campaigns-section";
import { CampaignTypeView } from "@/sections/campaigns/campaign-type-view";
import { WorkflowSection } from "@/sections/campaigns/workflow-section";
import { CampaignPaymentScreen } from "@/sections/campaigns/campaign-payment-screen";
import { CampaignScreen } from "@/sections/campaigns/campaign-screen";
import { StatisticsSection } from "@/sections/statistics/statistics-section";
import { SettingsSection } from "@/sections/settings/settings-section";
import { DevPanel } from "@/components/dev/dev-panel";

const SHELL_EASE = [0.32, 0.72, 0, 1] as const;

function BottomBarSlot() {
  const { view } = useAppState();
  const { mode } = useChat();
  // При открытом drawer нижний бар скрыт — у drawer свой композер.
  if (mode === "sidebar") return null;
  return view.kind === "guided-signal" ? (
    <ChatPanel placeholder="Введите ваши параметры или задайте вопрос" />
  ) : (
    <ShellBottomBar />
  );
}

export default function Home() {
  const { view, launchFlyoutOpen, activeSection } = useAppState();
  const dispatch = useAppDispatch();
  const welcomeChat = useOnboardingChat();

  const isSurveyFullscreen = view.kind === "survey";

  // Routing key for the renderMain animation. View kinds that render the
  // SAME section component must collapse to one key, otherwise switching
  // between them (e.g. signal_added flips guided-signal → awaiting-campaign,
  // both routed to GuidedSignalSection) causes a remount and wipes the
  // section's local state (pendingSignalId, current wizard step, etc).
  const viewKey =
    view.kind === "awaiting-campaign" ? "guided-signal" : view.kind;

  function renderMain() {
    if (view.kind === "welcome") {
      return <WelcomeSection />;
    }
    if (view.kind === "survey") {
      return (
        <SurveySection
          withOnboardingScreens
          onComplete={() => { /* start_signal_flow routes the user from here */ }}
        />
      );
    }
    if (view.kind === "guided-signal" || view.kind === "awaiting-campaign")
      return <GuidedSignalSection />;
    if (view.kind === "campaign-select")
      return (
        <CampaignTypeView
          onSelect={(id, name) =>
            dispatch({ type: "campaign_selected", campaign: { id, name } })
          }
        />
      );
    if (view.kind === "workflow") return <WorkflowSection />;
    if (view.kind === "campaign-payment") return <CampaignPaymentScreen />;
    if (view.kind === "campaign") return <CampaignScreen />;
    if (view.kind === "section") {
      if (view.name === "Статистика") return <StatisticsSection />;
      if (view.name === "Сигналы") return <SignalsSection />;
      if (view.name === "Кампании") return <CampaignsSection />;
      if (view.name === "Настройки") return <SettingsSection />;
    }
    return null;
  }

  return (
    <PromptInputProvider>
      <PromptChipsProvider>
      <WelcomeChatProvider value={welcomeChat}>
        <ChatProvider>
        <DraftQueueProvider>
        <TriggerEditRegistryProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <AnimatePresence initial={false}>
            {!isSurveyFullscreen && (
              <motion.div
                key="sidebar"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.28, ease: SHELL_EASE }}
              >
                <AppSidebar
                  activeNav={activeSection ?? undefined}
                  onNavChange={(nav) => dispatch({ type: "sidebar_nav", section: nav })}
                  onLaunchOpen={() => dispatch({ type: "flyout_open" })}
                  onLogoClick={() => dispatch({ type: "go_welcome" })}
                  flyoutOpen={launchFlyoutOpen}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {!isSurveyFullscreen && (
            <LaunchFlyout
              open={launchFlyoutOpen}
              onClose={() => dispatch({ type: "flyout_close" })}
            />
          )}
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={viewKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.26, ease: SHELL_EASE }}
                className="flex flex-1 flex-col overflow-hidden"
              >
                {renderMain()}
              </motion.div>
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {!isSurveyFullscreen && (
                <motion.div
                  key="bottom-bar"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.28, ease: SHELL_EASE }}
                >
                  <BottomBarSlot />
                </motion.div>
              )}
            </AnimatePresence>
            <ChatDrawer placeholder="Введите ваши параметры или задайте вопрос" />
            <DevPanel />
          </div>
        </div>
        </TriggerEditRegistryProvider>
        </DraftQueueProvider>
        </ChatProvider>
      </WelcomeChatProvider>
      </PromptChipsProvider>
    </PromptInputProvider>
  );
}
