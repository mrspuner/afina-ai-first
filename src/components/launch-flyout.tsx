"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LaunchFlyoutProps {
  open: boolean;
  onClose: () => void;
}

const signalCards = [
  { title: "Реактивация", description: "Вернуть пользователей, переставших быть активными" },
  { title: "Удержание", description: "Предотвратить отток перед ключевыми точками" },
  { title: "Апсейл", description: "Предложить переход на старший план" },
];

const campaignCards = [
  { title: "С нуля", description: "Настроить кампанию под конкретную задачу вручную" },
  { title: "Онбординг", description: "Шаблон для новых пользователей" },
  { title: "Реактивация", description: "Шаблон для возврата неактивных" },
];

function ScenarioCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

export function LaunchFlyout({ open, onClose }: LaunchFlyoutProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop — клик закрывает */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Панель */}
      <div
        className={cn(
          "fixed inset-y-0 left-[220px] z-50 flex w-[360px] flex-col bg-background shadow-xl"
        )}
      >
        {/* Шапка панели */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Запустить</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Секция 1 */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Запустить поиск сигналов
          </p>
          <div className="mb-6 flex flex-col gap-2">
            {signalCards.map((card) => (
              <ScenarioCard key={card.title} {...card} onClick={onClose} />
            ))}
          </div>

          {/* Секция 2 */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Запустить новую кампанию
          </p>
          <div className="flex flex-col gap-2">
            {campaignCards.map((card) => (
              <ScenarioCard key={card.title} {...card} onClick={onClose} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
