import {
  SignalLow,
  GitFork,
  Clock,
  GitBranch,
  Merge,
  MessageSquare,
  Mail,
  Bell,
  Phone,
  Store,
  LayoutTemplate,
  CheckCircle2,
  CircleStop,
  type LucideIcon,
} from "lucide-react";
import type { WorkflowNodeType } from "@/types/workflow";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export interface NodeStyle {
  border: string;
  bg: string;
  color: string;
}

/** Цвета узлов workflow. Источник правды для самой карточки И для тегов (M5). */
export const NODE_STYLES: Record<WorkflowNodeType, NodeStyle> = {
  // Endpoints
  signal:     { border: "#1e3a8a", bg: "#050815", color: "#93c5fd" },
  success:    { border: "#14532d", bg: "#030d06", color: "#4ade80" },
  end:        { border: "#374151", bg: "#0a0a0a", color: "#9ca3af" },
  // Logic
  split:      { border: "#4c1d95", bg: "#0d0819", color: "#a78bfa" },
  wait:       { border: "#713f12", bg: "#0f0a03", color: "#fbbf24" },
  condition:  { border: "#065f46", bg: "#052e23", color: "#34d399" },
  merge:      { border: "#3730a3", bg: "#0a0920", color: "#818cf8" },
  // Communication
  sms:        { border: "#134e4a", bg: "#030f0e", color: "#5eead4" },
  email:      { border: "#155e75", bg: "#03141a", color: "#67e8f9" },
  push:       { border: "#1e40af", bg: "#050c1e", color: "#93c5fd" },
  ivr:        { border: "#6d28d9", bg: "#0e051b", color: "#c4b5fd" },
  // Web
  storefront: { border: "#9a3412", bg: "#1a0806", color: "#fb923c" },
  landing:    { border: "#b45309", bg: "#1a0f03", color: "#fbbf24" },
  // Legacy
  default:    { border: "#2a2a2a", bg: "#111111", color: "#e5e5e5" },
  channel:    { border: "#134e4a", bg: "#030f0e", color: "#5eead4" },
  retarget:   { border: "#7f1d1d", bg: "#110505", color: "#f87171" },
  result:     { border: "#14532d", bg: "#030d06", color: "#4ade80" },
  new:        { border: "#78350f", bg: "#0f0a03", color: "#fbbf24" },
};

export const NODE_ICON: Partial<Record<WorkflowNodeType, LucideIcon>> = {
  signal: SignalLow,
  split: GitFork,
  wait: Clock,
  condition: GitBranch,
  merge: Merge,
  sms: MessageSquare,
  email: Mail,
  push: Bell,
  ivr: Phone,
  storefront: Store,
  landing: LayoutTemplate,
  success: CheckCircle2,
  end: CircleStop,
};

/** Цвет узла по kind. Падает на `default`, если kind неизвестен. */
export function getNodeColor(nodeType: string): string {
  return (NODE_STYLES[nodeType as WorkflowNodeType] ?? NODE_STYLES.default).color;
}

/** Иконка узла по kind, либо undefined (узел без иконки). */
export function getNodeIcon(nodeType: string): LucideIcon | undefined {
  return NODE_ICON[nodeType as WorkflowNodeType];
}

/**
 * Pre-rendered SVG-строки для иконок типов узлов. Рендер происходит один
 * раз при импорте модуля (React DOM Server работает и на сервере, и в
 * браузере). Используется в чипах PromptBar — там React не управляет
 * содержимым (contentEditable + императивный DOM), поэтому Lucide-компонент
 * нельзя смонтировать обычным путём, а строку — можно: вставляем через
 * `innerHTML` в нейтральный <span aria-hidden>.
 *
 * Lucide SVG задают `stroke="currentColor"` — цвет наследуется от родителя.
 */
const NODE_ICON_SVG: Partial<Record<WorkflowNodeType, string>> =
  Object.fromEntries(
    Object.entries(NODE_ICON).map(([nodeType, Icon]) => [
      nodeType,
      renderToStaticMarkup(
        createElement(Icon, {
          size: 14,
          strokeWidth: 2,
          "aria-hidden": true,
        })
      ),
    ])
  ) as Partial<Record<WorkflowNodeType, string>>;

/** SVG-строка иконки узла или null, если для типа иконки нет. */
export function getNodeIconSvg(nodeType: string): string | null {
  return NODE_ICON_SVG[nodeType as WorkflowNodeType] ?? null;
}
