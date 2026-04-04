"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTypewriter } from "@/hooks/use-typewriter";

interface StepContentProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function StepContent({
  title,
  subtitle,
  children,
  maxWidth = "max-w-2xl",
}: StepContentProps) {
  const { displayed: titleText, isDone: titleDone } = useTypewriter(title, 25);
  const { displayed: subtitleText, isDone: subtitleDone } = useTypewriter(
    titleDone ? subtitle : "",
    18
  );

  return (
    <div className={`w-full ${maxWidth}`}>
      <div className="mb-8 text-center">
        <h1 className="min-h-[2rem] text-2xl font-semibold tracking-tight text-foreground">
          {titleText}
          {!titleDone && (
            <span className="ml-0.5 animate-pulse opacity-60">|</span>
          )}
        </h1>
        <p className="mt-1.5 min-h-[1.25rem] text-sm text-muted-foreground">
          {subtitleText}
          {titleDone && !subtitleDone && (
            <span className="ml-0.5 animate-pulse opacity-60">|</span>
          )}
        </p>
      </div>

      <AnimatePresence>
        {subtitleDone && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
