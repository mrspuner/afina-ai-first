"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import { PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptBarProps {
  /** Тело бара — инпут, футер, чипсы конкретного экрана. */
  children: ReactNode;
  /** Открывает правый AI-drawer. */
  onOpenDrawer: () => void;
  /** Контент между шапкой и телом (transient reply, budget-help ответ). */
  slot?: ReactNode;
  /** Доп. классы карточки. */
  cardClassName?: string;
}

/**
 * Единая обёртка промпт-бара для всех экранов. Шапка (маскот + «Афина ИИ» +
 * кнопка drawer) одинакова везде; тело передаётся через children.
 * Карточка измеряется через ResizeObserver — это единственный источник
 * CSS-переменной --promptbar-height (потребляется утилитой pb-promptbar).
 */
export function PromptBar({ children, onOpenDrawer, slot, cardClassName }: PromptBarProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        "--promptbar-height",
        `${Math.round(h)}px`
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--promptbar-height");
    };
  }, []);

  return (
    <div className="fixed left-[120px] right-0 bottom-5 z-30 flex justify-center px-6">
      <div
        ref={cardRef}
        className={cn(
          "flex w-full max-w-[720px] flex-col gap-2 rounded-[16px] p-3",
          "bg-[rgba(10,10,10,0.75)] shadow-[0_0_17px_9px_rgba(0,0,0,0.19)] backdrop-blur-[2px]",
          cardClassName
        )}
      >
        <div className="flex w-full items-center justify-between px-1 py-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Image
              src="/mascot-icon.svg"
              alt=""
              width={14}
              height={14}
              aria-hidden
              className="shrink-0"
            />
            Афина ИИ
          </span>
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Открыть в drawer"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </div>
        {slot}
        {children}
      </div>
    </div>
  );
}
