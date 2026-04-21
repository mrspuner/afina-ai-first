"use client";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { useAppState, useAppDispatch } from "@/state/app-state-context";
import { AppSidebar } from "@/sections/shell/app-sidebar";
import { LaunchFlyout } from "@/sections/shell/launch-flyout";
import { ShellBottomBar } from "@/sections/shell/shell-bottom-bar";
import { WelcomeSection } from "@/sections/welcome/welcome-section";
import { GuidedSignalSection } from "@/sections/signals/guided-signal-section";
import { SignalsSection } from "@/sections/signals/signals-section";
import { CampaignsSection } from "@/sections/campaigns/campaigns-section";
import { CampaignTypeView } from "@/sections/campaigns/campaign-type-view";
import { WorkflowSection } from "@/sections/campaigns/workflow-section";
import { StatisticsSection } from "@/sections/statistics/statistics-section";
import { DevPanel } from "@/components/dev/dev-panel";

export default function Home() {
  const { view, launchFlyoutOpen, activeSection } = useAppState();
  const dispatch = useAppDispatch();

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
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar
          activeNav={activeSection ?? undefined}
          onNavChange={(nav) => dispatch({ type: "sidebar_nav", section: nav })}
          onLaunchOpen={() => dispatch({ type: "flyout_open" })}
          flyoutOpen={launchFlyoutOpen}
        />
        <LaunchFlyout
          open={launchFlyoutOpen}
          onClose={() => dispatch({ type: "flyout_close" })}
        />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {renderMain()}
          <ShellBottomBar />
          <DevPanel />
        </div>
      </div>
    </PromptInputProvider>
  );
}
