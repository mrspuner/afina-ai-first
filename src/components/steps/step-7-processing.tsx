"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { StepContent } from "@/components/steps/step-content";
import { StepProps } from "@/types/campaign";

const TOTAL_DURATION = 4000; // ms
const TICK = 50;

export function Step7Processing({ data, onNext }: StepProps) {
  const [progress, setProgress] = useState(0);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  useEffect(() => {
    const steps = TOTAL_DURATION / TICK;
    let count = 0;
    const id = setInterval(() => {
      count++;
      setProgress(Math.min((count / steps) * 100, 100));
      if (count >= steps) {
        clearInterval(id);
        setTimeout(() => onNextRef.current({}), 200);
      }
    }, TICK);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepContent
      title="Ваша кампания обрабатывается"
      subtitle="Это займёт некоторое время. Скоро вы получите сигналы"
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-3">
        {/* Progress track */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.05, ease: "linear" }}
          />
        </div>
        <p className="text-right text-xs tabular-nums text-muted-foreground">
          {Math.round(progress)}%
        </p>
      </div>
    </StepContent>
  );
}
