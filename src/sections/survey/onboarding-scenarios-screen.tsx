"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { scenarioCount } from "@/data/scenarios";

interface OnboardingScenariosScreenProps {
  onChooseScenario: () => void;
}

export function OnboardingScenariosScreen({ onChooseScenario }: OnboardingScenariosScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="mx-auto flex w-full max-w-2xl flex-col items-start gap-6"
    >
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
        className="text-[38px] font-semibold leading-[1.1] tracking-tight"
      >
        Мы нашли {scenarioCount} сценариев<br />специально для вас
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-md text-sm text-muted-foreground"
      >
        Каждый сценарий — готовая связка сигнала и кампании, адаптированная под ваш бизнес.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
      >
        <Button onClick={onChooseScenario}>Выбрать сценарий →</Button>
      </motion.div>
    </motion.div>
  );
}
