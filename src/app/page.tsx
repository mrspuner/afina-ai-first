"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CampaignWorkspace } from "@/components/campaign-workspace";
import { StatisticsView } from "@/components/statistics-view";
import { LaunchFlyout } from "@/components/launch-flyout";
import { WelcomeView } from "@/components/welcome-view";

export default function Home() {
  const [activeNav, setActiveNav] = useState<string | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);

  function renderMain() {
    if (activeNav === null) {
      return <WelcomeView onStep1Click={() => setActiveNav("Кампании")} />;
    }
    if (activeNav === "Статистика") {
      return <StatisticsView />;
    }
    return <CampaignWorkspace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        activeNav={activeNav ?? undefined}
        onNavChange={setActiveNav}
        onLaunchOpen={() => setLaunchOpen(true)}
        flyoutOpen={launchOpen}
      />
      <LaunchFlyout open={launchOpen} onClose={() => setLaunchOpen(false)} />
      {renderMain()}
    </div>
  );
}
