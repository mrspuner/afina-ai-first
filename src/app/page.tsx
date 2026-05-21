"use client";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { PromptChipsProvider } from "@/state/prompt-chips-context";
import { ChatProvider } from "@/state/chat-context";
import { TriggerEditRegistryProvider } from "@/state/trigger-edit-context";
import { DraftQueueProvider } from "@/state/draft-queue-context";
import { ChatPanel } from "@/sections/shell/chat-panel";
import { ChatDrawer } from "@/sections/shell/chat-drawer";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { isOnboarding } from "@/state/app-state";
import { AnimatePresence, motion } from "motion/react";
import { useChat } from "@/state/chat-context";
import { AppSidebar } from "@/sections/shell/app-sidebar";
import { LaunchFlyout } from "@/sections/shell/launch-flyout";
import { ScenarioCatalogModal } from "@/sections/signals/scenario-catalog-modal";
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

/**
 * Same exponential curve as HERO_EASE in welcome-view.tsx — exit/enter the
 * chrome with no bounce and a duration that matches the welcome hero swap.
 */
const CHROME_EASE = [0.32, 0.72, 0, 1] as const;
const CHROME_DURATION = 0.42;

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
  const state = useAppState();
  const { view, launchFlyoutOpen, activeSection, catalog, surveyStatus } = state;
  const onboarding = isOnboarding(state);
  const dispatch = useAppDispatch();
  const welcomeChat = useOnboardingChat();

  function renderMain() {
    if (view.kind === "welcome") {
      // First-entry 3-screen onboarding: site → enrich → interests →
      // scenarios → catalog. Skippable; once completed or skipped,
      // surveyStatus closes the gate and we render WelcomeSection.
      if (surveyStatus === "not_started") {
        return (
          <SurveySection
            skippable
            withOnboardingScreens
            onComplete={() => { /* survey_completed re-renders WelcomeSection */ }}
            onSkip={() => { /* survey_skipped re-renders WelcomeSection */ }}
          />
        );
      }
      return <WelcomeSection />;
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
            {!onboarding && (
              <motion.div
                key="app-sidebar"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: CHROME_DURATION, ease: CHROME_EASE }}
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
          {!onboarding && (
            <LaunchFlyout
              open={launchFlyoutOpen}
              onClose={() => dispatch({ type: "flyout_close" })}
            />
          )}
          <ScenarioCatalogModal
            open={catalog !== null}
            onClose={() => dispatch({ type: "catalog_close" })}
            onSelect={(scenarioId) => dispatch({ type: "catalog_select", scenarioId })}
          />
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {renderMain()}
            <AnimatePresence initial={false}>
              {!onboarding && (
                <motion.div
                  key="bottom-bar"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: CHROME_DURATION, ease: CHROME_EASE }}
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
