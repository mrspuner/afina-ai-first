"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TopUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current account balance, in roubles. */
  balance: number;
  /** Cost of the entity being launched (signal or campaign), in roubles. */
  cost: number;
  /** Human label for the entity being paid for, e.g. "Регистрация · 4 312". */
  entityLabel?: string;
  /** Called once payment is "успешно". Carries the topped-up amount. */
  onPaymentSuccess: (amount: number) => void;
}

type Method = "card" | "invoice";

const METHODS: { id: Method; label: string; hint: string; icon: typeof CreditCard }[] = [
  { id: "card", label: "Банковская карта", hint: "Visa / MasterCard / МИР", icon: CreditCard },
  { id: "invoice", label: "Счёт на оплату", hint: "Юр. лицо · 1–3 дня", icon: Wallet },
];

/** Bare minimum to top up to cover cost. Negative shortfalls clamp to 0. */
export function computeShortfall(balance: number, cost: number): number {
  return Math.max(0, cost - balance);
}

function formatRub(amount: number): string {
  return `₽ ${amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}`;
}

export function TopUpModal({
  open,
  onOpenChange,
  balance,
  cost,
  entityLabel,
  onPaymentSuccess,
}: TopUpModalProps) {
  const shortfall = useMemo(() => computeShortfall(balance, cost), [balance, cost]);
  const [amount, setAmount] = useState<string>(String(shortfall));
  const [method, setMethod] = useState<Method>("card");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when (re)opening or when shortfall changes. Synchronising
  // wizard-controlled local state against incoming props is the legitimate
  // use case for setState-in-effect; the lint warning here is intentional.
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setAmount(String(shortfall));
    setMethod("card");
    setPaying(false);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, shortfall]);

  const numericAmount = Number.parseFloat(amount.replace(",", ".")) || 0;
  const tooLow = numericAmount < shortfall;
  const canPay = !tooLow && numericAmount > 0 && !paying;

  function handlePay() {
    if (!canPay) return;
    setPaying(true);
    setError(null);
    // Mock: 1.2s "round-trip" to a payment gateway.
    setTimeout(() => {
      // Demo error case: amount ending in .13 simulates a failure.
      if (amount.endsWith(".13") || amount.endsWith(",13")) {
        setPaying(false);
        setError(
          "Платёж не прошёл. Попробуйте другой способ или свяжитесь с поддержкой."
        );
        return;
      }
      onPaymentSuccess(numericAmount);
    }, 1200);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Пополнить баланс</DialogTitle>
          <DialogDescription>
            {entityLabel
              ? `Чтобы запустить «${entityLabel}», нужно пополнить баланс.`
              : "Чтобы запустить, нужно пополнить баланс."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Стоимость</span>
              <span className="font-medium tabular-nums">{formatRub(cost)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Текущий баланс</span>
              <span className="font-medium tabular-nums">{formatRub(balance)}</span>
            </div>
            {shortfall > 0 && (
              <div className="mt-2 border-t border-border pt-2 flex items-center justify-between text-sm">
                <span className="text-foreground">Минимум к пополнению</span>
                <span className="font-semibold text-amber-600 tabular-nums">
                  {formatRub(shortfall)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="topup-amount">
              Сумма пополнения, ₽
            </label>
            <Input
              id="topup-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={tooLow ? true : undefined}
            />
            {tooLow && (
              <p className="text-xs text-destructive">
                Минимальная сумма для запуска — {formatRub(shortfall)}.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-foreground">Способ оплаты</p>
            <div className="flex flex-col gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-foreground/40 bg-accent"
                        : "border-border hover:bg-accent/60"
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.hint}</p>
                    </div>
                    <span
                      className={cn(
                        "h-3 w-3 shrink-0 rounded-full border",
                        active ? "border-foreground bg-foreground" : "border-border"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => window.alert("Поддержка: support@afina.ai")}
                className="mt-1 underline underline-offset-2"
              >
                Связаться с поддержкой
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={paying}>
            Отмена
          </Button>
          <Button onClick={handlePay} disabled={!canPay}>
            {paying ? "Платёж…" : `Оплатить ${formatRub(numericAmount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
