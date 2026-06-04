"use client";

import { useEffect, useRef } from "react";
import { useAppState } from "./app-state-context";
import { navigationScopeKey } from "./app-state";

/**
 * Вызывает `reset`, когда меняется навигационный scope (см.
 * {@link navigationScopeKey}) — секция→секция или view→view. Первый маунт
 * пропускается, чтобы не стирать начальное состояние.
 *
 * Единое правило очистки для всех эфемерных поверхностей ввода: чат (боковой
 * драйвер), чипы и очередь черновиков (нижний драйвер) подписываются на один и
 * тот же ключ, поэтому сбрасываются вместе и одинаково по всему интерфейсу.
 */
export function useScopeReset(reset: () => void): void {
  const { view } = useAppState();
  const key = navigationScopeKey(view);
  const prev = useRef<string | null>(null);
  useEffect(() => {
    if (prev.current !== null && prev.current !== key) {
      reset();
    }
    prev.current = key;
  }, [key, reset]);
}
