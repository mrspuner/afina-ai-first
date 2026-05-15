"use client";

import { motion } from "motion/react";
import { SiteBlock } from "./site-block";
import { BusinessBlock } from "./business-block";
import { RegionsBlock } from "./regions-block";
import { SummaryBlock } from "./summary-block";
import { InterestsBlock } from "./interests-block";
import { VoiceBlock } from "./voice-block";
import { DomainsBlock } from "./domains-block";

export function SettingsSection() {
  return (
    <div className="flex-1 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="mx-auto w-full max-w-2xl px-10 py-10"
      >
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Настройки
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Данные аккаунта — питают подбор интересов и генерацию кампаний.
          </p>
        </header>
        <div className="flex flex-col gap-8">
          <SiteBlock />
          <BusinessBlock />
          <RegionsBlock />
          <SummaryBlock />
          <InterestsBlock />
          <VoiceBlock />
          <DomainsBlock />
        </div>
      </motion.div>
    </div>
  );
}
