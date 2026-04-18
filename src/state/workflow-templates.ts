import type { SignalType } from "./app-state";
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
  WorkflowNodeData,
} from "@/types/workflow";

export interface Template {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

type NodeExtras = Partial<Pick<WorkflowNodeData, "isSuccess" | "needsAttention">>;

function n(
  id: string,
  label: string,
  nodeType: WorkflowNodeType,
  x: number,
  y: number,
  sublabel?: string,
  extras?: NodeExtras
): WorkflowNode {
  return {
    id,
    type: "workflowNode",
    position: { x, y },
    data: { label, nodeType, sublabel, ...extras },
  };
}

const EDGE_STYLE = { stroke: "#2a2a2a", strokeWidth: 1.5 };
const LABEL_STYLE = { fill: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: 500 };

function e(source: string, target: string, label?: string): WorkflowEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: "default",
    style: EDGE_STYLE,
    ...(label ? { label, labelStyle: LABEL_STYLE } : {}),
  };
}

const STEP = 210;

function registrationTemplate(): Template {
  return {
    nodes: [
      n("signal", "Сигнал", "signal", 0, 0, "Регистрация"),
      n("email", "Email", "email", STEP, 0, "Welcome"),
      n("wait", "Wait 1d", "wait", STEP * 2, 0, "Задержка"),
      n("push", "Push", "push", STEP * 3, 0, "Напоминание"),
      n("success", "Успех", "success", STEP * 4, 0, "Активирован", { isSuccess: true }),
      n("end", "Конец", "end", STEP * 4, 120, "Без конверсии"),
    ],
    edges: [
      e("signal", "email"),
      e("email", "wait"),
      e("wait", "push"),
      e("push", "success"),
    ],
  };
}

function firstDealTemplate(): Template {
  return {
    nodes: [
      n("signal", "Сигнал", "signal", 0, 0, "Первая сделка"),
      n("sms", "SMS", "sms", STEP, 0, "Промо"),
      n("condition", "Открыл?", "condition", STEP * 2, 0, "Проверка события"),
      n("landing", "Landing", "landing", STEP * 3, -80, "Покупка"),
      n("push", "Push", "push", STEP * 3, 80, "Напомни"),
      n("success", "Успех", "success", STEP * 4, -80, "Конверсия", { isSuccess: true }),
      n("end", "Конец", "end", STEP * 4, 80),
    ],
    edges: [
      e("signal", "sms"),
      e("sms", "condition"),
      e("condition", "landing", "YES"),
      e("condition", "push", "NO"),
      e("landing", "success"),
      e("push", "end"),
    ],
  };
}

function upsellTemplate(): Template {
  return {
    nodes: [
      n("signal", "Сигнал", "signal", 0, 0, "Апсейл"),
      n("split", "Split", "split", STEP, 0, "По сегменту"),
      n("storefront", "Витрина", "storefront", STEP * 2, -120, "Max"),
      n("email", "Email", "email", STEP * 2, -40, "High"),
      n("sms", "SMS", "sms", STEP * 2, 40, "Mid"),
      n("end", "Конец", "end", STEP * 2, 120, "Low"),
      n("landing", "Landing", "landing", STEP * 3, -40, "Оффер"),
      n("merge", "Merge", "merge", STEP * 4, -40),
      n("success", "Успех", "success", STEP * 5, -40, "Купил", { isSuccess: true }),
    ],
    edges: [
      e("signal", "split"),
      e("split", "storefront", "Макс"),
      e("split", "email", "Выс"),
      e("split", "sms", "Ср"),
      e("split", "end", "Низ"),
      e("storefront", "landing"),
      e("email", "landing"),
      e("sms", "landing"),
      e("landing", "merge"),
      e("merge", "success"),
    ],
  };
}

function reactivationTemplate(): Template {
  return {
    nodes: [
      n("signal", "Сигнал", "signal", 0, 0, "Реактивация"),
      n("wait", "Wait 3d", "wait", STEP, 0, "Задержка"),
      n("sms", "SMS", "sms", STEP * 2, 0, "Оффер"),
      n("condition", "Кликнул?", "condition", STEP * 3, 0, "Проверка"),
      n("landing", "Landing", "landing", STEP * 4, -80, "Оффер"),
      n("ivr", "IVR", "ivr", STEP * 4, 80, "Звонок"),
      n("success", "Успех", "success", STEP * 5, -80, "Вернулся", { isSuccess: true }),
      n("end", "Конец", "end", STEP * 5, 80),
    ],
    edges: [
      e("signal", "wait"),
      e("wait", "sms"),
      e("sms", "condition"),
      e("condition", "landing", "YES"),
      e("condition", "ivr", "NO"),
      e("landing", "success"),
      e("ivr", "end"),
    ],
  };
}

function returnTemplate(): Template {
  return {
    nodes: [
      n("signal", "Сигнал", "signal", 0, 0, "Возврат"),
      n("email", "Email", "email", STEP, 0, "Напоминание"),
      n("wait", "Wait 3d", "wait", STEP * 2, 0, "Задержка"),
      n("push", "Push", "push", STEP * 3, 0, "Усилить"),
      n("condition", "Открыл?", "condition", STEP * 4, 0, "Проверка"),
      n("storefront", "Витрина", "storefront", STEP * 5, -80, "Офферы"),
      n("end", "Конец", "end", STEP * 5, 80),
      n("success", "Успех", "success", STEP * 6, -80, "Купил", { isSuccess: true }),
    ],
    edges: [
      e("signal", "email"),
      e("email", "wait"),
      e("wait", "push"),
      e("push", "condition"),
      e("condition", "storefront", "YES"),
      e("condition", "end", "NO"),
      e("storefront", "success"),
    ],
  };
}

function retentionTemplate(): Template {
  return {
    nodes: [
      n("signal", "Сигнал", "signal", 0, 0, "Удержание"),
      n("split", "Split", "split", STEP, 0, "По сегменту"),
      n("ivr", "IVR", "ivr", STEP * 2, -100, "Персональный звонок"),
      n("email", "Email", "email", STEP * 2, 0, "Дайджест"),
      n("push", "Push", "push", STEP * 2, 100, "Напомни"),
      n("merge", "Merge", "merge", STEP * 3, 0),
      n("wait", "Wait 7d", "wait", STEP * 4, 0, "Задержка"),
      n("success", "Успех", "success", STEP * 5, 0, "Активен", { isSuccess: true }),
    ],
    edges: [
      e("signal", "split"),
      e("split", "ivr", "Выс"),
      e("split", "email", "Ср"),
      e("split", "push", "Низ"),
      e("ivr", "merge"),
      e("email", "merge"),
      e("push", "merge"),
      e("merge", "wait"),
      e("wait", "success"),
    ],
  };
}

export const TEMPLATE_BY_TYPE: Record<SignalType, () => Template> = {
  "Регистрация": registrationTemplate,
  "Первая сделка": firstDealTemplate,
  "Апсейл": upsellTemplate,
  "Реактивация": reactivationTemplate,
  "Возврат": returnTemplate,
  "Удержание": retentionTemplate,
};

export function createTemplate(signalType: SignalType): Template {
  return TEMPLATE_BY_TYPE[signalType]();
}
