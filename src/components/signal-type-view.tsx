"use client";

const SCENARIO_NAMES: Record<string, string> = {
  registration: "Регистрация",
  "first-deal":  "Первая сделка",
  upsell:        "Апсейл",
  retention:     "Удержание",
  return:        "Возврат",
  reactivation:  "Реактивация",
};

interface SignalCardData {
  scenarioId: string;
  count: number;
  createdAt: string;
}

interface SignalTypeViewProps {
  onCreateSignal: () => void;
  signal?: SignalCardData | null;
  onLaunchCampaign?: () => void;
}

export function SignalTypeView({ onCreateSignal, signal, onLaunchCampaign }: SignalTypeViewProps) {
  const scenarioName = signal
    ? (SCENARIO_NAMES[signal.scenarioId] ?? signal.scenarioId)
    : null;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-8 pb-40 pt-[140px]">
      <div className="mx-auto flex w-full max-w-2xl flex-col">
        {/* Section header */}
        <h1 className="mb-6 text-center text-[38px] font-semibold leading-[46px] tracking-tight">
          Сигналы
        </h1>

        {/* Signal card */}
        {signal && (
          <div className="mb-4 rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">
              {scenarioName} · {signal.count.toLocaleString("ru-RU")} сигналов
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{signal.createdAt}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Скачать сигналы
              </button>
              <button
                type="button"
                onClick={onLaunchCampaign}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Запустить кампанию
              </button>
            </div>
          </div>
        )}

        {/* Empty state / create button */}
        {!signal ? (
          <div className="fixed inset-0 left-[120px] flex flex-col items-center justify-center">
            <p className="mb-4 max-w-sm text-center text-sm text-muted-foreground">
              Вы не создали ещё ни одного сигнала. Перед тем как запустить кампанию,
              сформируйте первый сигнал.
            </p>
            <button
              type="button"
              onClick={onCreateSignal}
              className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Создать сигнал
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onCreateSignal}
            className="self-start rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            + Создать сигнал
          </button>
        )}
      </div>
    </div>
  );
}
