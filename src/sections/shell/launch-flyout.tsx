"use client";

import { X } from "lucide-react";

interface LaunchFlyoutProps {
  open: boolean;
  onClose: () => void;
  onSignalSelect: (id: string, name: string) => void;
  onCampaignSelect: () => void;
}

const signalCards = [
  { id: "registration", title: "Регистрация",   description: "Возврат пользователей после незавершённой регистрации или брошенной корзины" },
  { id: "first-deal",   title: "Первая сделка", description: "Обогащение данных о клиенте, оценка потенциала и рисков" },
  { id: "upsell",       title: "Апсейл",        description: "Мониторинг интереса к конкурентам, предотвращение оттока" },
  { id: "retention",    title: "Удержание",     description: "Мониторинг интереса к конкурентам и предотвращение оттока" },
  { id: "return",       title: "Возврат",       description: "Определение оптимального момента для повторного контакта" },
  { id: "reactivation", title: "Реактивация",   description: "Определение оптимального момента для повторного контакта" },
];

const campaignCards = [
  { title: "Возврат брошенных действий", description: "Возвращаем пользователей, не завершивших действие, через персонализированные касания" },
  { title: "Прогрев до следующего шага", description: "Увеличиваем конверсию через серию касаний с нарастающей ценностью" },
  { title: "Стимулирование повторной активности", description: "Возвращаем интерес пользователей через офферы и релевантные напоминания" },
  { title: "Удержание через поведенческие триггеры", description: "Предотвращаем отток через своевременные реакции на изменения поведения" },
  { title: "Реактивация через адаптивный сценарий", description: "Перестраиваем коммуникацию по сегментам, реакции и времени отклика пользователей" },
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

export function LaunchFlyout({ open, onClose, onSignalSelect, onCampaignSelect }: LaunchFlyoutProps) {
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
      <div className="fixed inset-y-0 left-[120px] z-50 flex w-[360px] flex-col bg-card shadow-xl">
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
          <div className="mb-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
              Запустить поиск сигналов
            </p>
            <div className="flex flex-col gap-2">
              {signalCards.map((card) => (
                <ScenarioCard key={card.title} title={card.title} description={card.description} onClick={() => { onSignalSelect(card.id, card.title); onClose(); }} />
              ))}
            </div>
          </div>

          {/* Секция 2 */}
          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
              Запустить новую кампанию
            </p>
            <div className="flex flex-col gap-2">
              {campaignCards.map((card) => (
                <ScenarioCard key={card.title} title={card.title} description={card.description} onClick={() => { onCampaignSelect(); onClose(); }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
