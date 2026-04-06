"use client";

import { cn } from "@/lib/utils";

const CAMPAIGNS = [
  {
    id: "abandoned",
    name: "Возврат брошенных действий",
    description: "Возвращаем пользователей, не завершивших действие, через персонализированные касания",
  },
  {
    id: "warmup",
    name: "Прогрев до следующего шага",
    description: "Увеличиваем конверсию через серию касаний с нарастающей ценностью",
  },
  {
    id: "reactivation-stimulate",
    name: "Стимулирование повторной активности",
    description: "Возвращаем интерес пользователей через офферы и релевантные напоминания",
  },
  {
    id: "behavioral-retention",
    name: "Удержание через поведенческие триггеры",
    description: "Предотвращаем отток через своевременные реакции на изменения поведения",
  },
  {
    id: "adaptive-reactivation",
    name: "Реактивация через адаптивный сценарий",
    description: "Перестраиваем коммуникацию по сегментам, реакции и времени отклика пользователей",
  },
];

interface CampaignCardData {
  typeName: string;
  launchedAt: string;
}

interface CampaignTypeViewProps {
  onSelect?: (id: string, name: string) => void;
  campaign?: CampaignCardData | null;
}

export function CampaignTypeView({ onSelect, campaign }: CampaignTypeViewProps) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pb-40 pt-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col">
        {/* Section header */}
        <h1 className="mb-6 text-[38px] font-semibold leading-[46px] tracking-tight">
          Кампании
        </h1>

        {/* Campaign card */}
        {campaign && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{campaign.typeName}</p>
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-400">
                Активна
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Запущена {campaign.launchedAt}</p>
          </div>
        )}

        {/* Campaign type selection */}
        <div>
          {campaign ? (
            <p className="mb-4 text-sm font-medium text-foreground">Создать ещё одну кампанию</p>
          ) : (
            <p className="mb-4 text-sm font-medium text-foreground">Выберите тип кампании</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            {CAMPAIGNS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect?.(c.id, c.name)}
                className={cn(
                  "flex flex-col items-start rounded-lg border p-4 text-left transition-all",
                  "border-border bg-card hover:bg-accent hover:border-border"
                )}
              >
                <span className="text-sm font-medium text-foreground">{c.name}</span>
                <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {c.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
