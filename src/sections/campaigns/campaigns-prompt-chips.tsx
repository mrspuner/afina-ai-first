"use client";

import { motion } from "motion/react";

const CHIPS = [
  "Прибыльные кампании",
  "Активные кампании",
  "Завершённые кампании",
] as const;

interface CampaignsPromptChipsProps {
  onChipClick: (text: string) => void;
}

export function CampaignsPromptChips({ onChipClick }: CampaignsPromptChipsProps) {
  return (
    <div className="flex flex-wrap justify-start gap-2">
      {CHIPS.map((label, i) => (
        <motion.button
          key={label}
          type="button"
          onClick={() => onChipClick(label)}
          initial={{ y: 6, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{
            duration: 0.26,
            ease: [0.23, 1, 0.32, 1],
            delay: i * 0.04,
          }}
          whileTap={{ scale: 0.97 }}
          className="rounded-full border border-white/10 bg-[#171717] px-[13px] py-[7px] text-[12px] text-white transition-colors duration-150 ease-out hover:bg-[#1f1f1f]"
        >
          {label}
        </motion.button>
      ))}
    </div>
  );
}
