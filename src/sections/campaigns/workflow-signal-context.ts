"use client";

import { createContext, useContext } from "react";
import type { Signal } from "@/state/app-state";

/**
 * Сигнал текущей кампании, доступный нодам графа. Нужен сплиттеру (A6): при
 * разделении «по сегменту» число и подписи веток берутся из категорий,
 * выбранных в сигнале. xyflow рендерит ноды вне обычного дерева, поэтому
 * сигнал travels через контекст (выставляется один раз вокруг графа).
 */
const WorkflowSignalContext = createContext<Signal | null>(null);

export const WorkflowSignalProvider = WorkflowSignalContext.Provider;

export function useWorkflowSignal(): Signal | null {
  return useContext(WorkflowSignalContext);
}
