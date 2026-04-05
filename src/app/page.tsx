"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CampaignWorkspace } from "@/components/campaign-workspace";
import { StatisticsView } from "@/components/statistics-view";
import { LaunchFlyout } from "@/components/launch-flyout";

export default function Home() {
  const [activeNav, setActiveNav] = useState("Кампании");
  const [launchOpen, setLaunchOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        onLaunchOpen={() => setLaunchOpen(true)}
      />
      <LaunchFlyout open={launchOpen} onClose={() => setLaunchOpen(false)} />
      {activeNav === "Статистика" ? (
        <StatisticsView />
      ) : (
        <CampaignWorkspace />
      )}
    </div>
  );
}
