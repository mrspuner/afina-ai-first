"use client";

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
import { WelcomeChatProvider } from "@/sections/welcome/welcome-chat-context";
import { useOnboardingChat } from "@/sections/welcome/use-onboarding-chat";
import { GuidedSignalSection } from "@/sections/signals/guided-signal-section";
import { SignalsSection } from "@/sections/signals/signals-section";
import { CampaignsSection } from "@/sections/campaigns/campaigns-section";
import { CampaignTypeView } from "@/sections/campaigns/campaign-type-view";
import { WorkflowSection } from "@/sections/campaigns/workflow-section";
import { StatisticsSection } from "@/sections/statistics/statistics-section";
import { DevPanel } from "@/components/dev/dev-panel";

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

  function renderMain() {
    if (view.kind === "welcome") return <WelcomeSection />;
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
    if (view.kind === "section") {
      if (view.name === "Статистика") return <StatisticsSection />;
      if (view.name === "Сигналы") return <SignalsSection />;
      if (view.name === "Кампании") return <CampaignsSection />;
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
          <AppSidebar
            activeNav={activeSection ?? undefined}
            onNavChange={(nav) => dispatch({ type: "sidebar_nav", section: nav })}
            onLaunchOpen={() => dispatch({ type: "flyout_open" })}
            onLogoClick={() => dispatch({ type: "go_welcome" })}
            flyoutOpen={launchFlyoutOpen}
          />
          <LaunchFlyout
            open={launchFlyoutOpen}
            onClose={() => dispatch({ type: "flyout_close" })}
          />
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {renderMain()}
            <BottomBarSlot />
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
