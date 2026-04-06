// src/components/workflow-status.tsx
"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";

interface CounterCardProps {
  label: string;
  target: number;
  delay: number;
  accent?: boolean;
}

function CounterCard({ label, target, delay, accent }: CounterCardProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (startedRef.current || !elRef.current) return;
      startedRef.current = true;
      const el = elRef.current;
      const duration = 4000;
      const start = performance.now();
      function step(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased).toLocaleString("ru");
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timer);
  }, [target, delay]);

  return (
    <div className="flex min-w-[140px] flex-col items-center rounded-xl border border-border bg-card px-7 py-5">
      <div
        ref={elRef}
        className="text-[32px] font-bold leading-none"
        style={{ color: accent ? "#4ade80" : undefined }}
      >
        0
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

interface WorkflowStatusProps {
  onGoToStats: () => void;
}

export function WorkflowStatus({ onGoToStats }: WorkflowStatusProps) {
  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Status badge */}
      <div className="flex items-center gap-2 rounded-full border border-[#14532d] bg-[#030d06] px-4 py-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#4ade80]"
          style={{ animation: "wf-pulse 1.5s ease-in-out infinite" }}
        />
        <span className="text-xs font-medium text-[#4ade80]">Кампания запущена</span>
      </div>

      {/* Stat cards — counters start after 3 s */}
      <div className="flex gap-5">
        <CounterCard label="Отправлено"  target={847} delay={3000} />
        <CounterCard label="Доставлено"  target={791} delay={3300} accent />
        <CounterCard label="Открыто"     target={214} delay={3700} />
      </div>

      <button
        type="button"
        onClick={onGoToStats}
        className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        Посмотреть статистику →
      </button>

      {/* Pulse keyframe injected once */}
      <style>{`
        @keyframes wf-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </motion.div>
  );
}
