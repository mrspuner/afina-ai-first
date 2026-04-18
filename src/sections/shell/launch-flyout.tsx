"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppState } from "@/state/app-state-context";
import { SignalRow } from "./signal-row";

const SIGNAL_TEMPLATES = [
  { id: "registration", title: "Регистрация",   description: "Возврат пользователей после незавершённой регистрации или брошенной корзины" },
  { id: "first-deal",   title: "Первая сделка", description: "Обогащение данных о клиенте, оценка потенциала и рисков" },
  { id: "upsell",       title: "Апсейл",        description: "Мониторинг интереса к конкурентам, предотвращение оттока" },
  { id: "retention",    title: "Удержание",     description: "Мониторинг интереса к конкурентам и предотвращение оттока" },
  { id: "return",       title: "Возврат",       description: "Определение оптимального момента для повторного контакта" },
  { id: "reactivation", title: "Реактивация",   description: "Определение оптимального момента для повторного контакта" },
];

interface LaunchFlyoutProps {
  open: boolean;
  onClose: () => void;
}

export function LaunchFlyout({ open, onClose }: LaunchFlyoutProps) {
  const { signals } = useAppState();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLElement>(null);

  const normalized = query.trim().toLocaleLowerCase("ru-RU");

  const filteredTemplates = useMemo(() => {
    if (!normalized) return SIGNAL_TEMPLATES;
    return SIGNAL_TEMPLATES.filter((t) =>
      t.title.toLocaleLowerCase("ru-RU").includes(normalized) ||
      t.description.toLocaleLowerCase("ru-RU").includes(normalized)
    );
  }, [normalized]);

  const sortedSignals = useMemo(
    () => [...signals].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [signals]
  );

  const filteredSignals = useMemo(() => {
    if (!normalized) return sortedSignals;
    return sortedSignals.filter((s) =>
      s.type.toLocaleLowerCase("ru-RU").includes(normalized)
    );
  }, [normalized, sortedSignals]);

  const nothingFound =
    normalized &&
    filteredTemplates.length === 0 &&
    filteredSignals.length === 0;

  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    if (!root) return;
    const firstInput = root.querySelector<HTMLInputElement>("input");
    firstInput?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a,button,input,textarea,select,[tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function selectTemplate(id: string, name: string) {
    dispatch({ type: "flyout_signal_select", id, name });
    onClose();
  }

  function selectSignal(signalId: string) {
    dispatch({ type: "campaign_from_signal", signalId });
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-label="Запустить"
        className="fixed inset-y-0 left-[120px] z-50 flex w-[360px] flex-col bg-card shadow-xl"
      >
        <header className="flex items-center justify-end px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              aria-label="Поиск"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {nothingFound ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Ничего не найдено.
            </p>
          ) : (
            <>
              {filteredTemplates.length > 0 && (
                <section className="mb-2">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground">
                    Новый сигнал
                  </p>
                  <div className="flex flex-col gap-2">
                    {filteredTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTemplate(t.id, t.title)}
                        className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
                      >
                        <p className="text-sm font-medium text-foreground">{t.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
                  Новая коммуникационная кампания
                </p>
                <p className="mt-1 mb-3 text-xs text-muted-foreground">
                  Создать кампанию по готовому сигналу
                </p>
                {signals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Нет сигналов. Создайте сигнал в разделе Сигналы.
                  </p>
                ) : filteredSignals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Сигналы не подходят под запрос.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredSignals.map((s) => (
                      <SignalRow key={s.id} signal={s} onClick={selectSignal} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
