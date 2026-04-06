import type { Node, Edge } from "@xyflow/react";

export type WorkflowNodeType =
  | "default"
  | "split"
  | "channel"
  | "retarget"
  | "result"
  | "new";

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  sublabel?: string;
  nodeType: WorkflowNodeType;
}

export type WorkflowNode = Node<WorkflowNodeData, "workflowNode">;
export type WorkflowEdge = Edge;

/** A command updater returns new nodes/edges given current state, or null if command not recognised. */
export type CommandUpdater = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
) => { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

function makeNode(
  id: string,
  label: string,
  nodeType: WorkflowNodeType,
  x: number,
  y: number,
  sublabel?: string
): WorkflowNode {
  return {
    id,
    type: "workflowNode",
    position: { x, y },
    data: { label, nodeType, sublabel },
  };
}

function makeEdge(source: string, target: string): WorkflowEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    style: { stroke: "#2a2a2a" },
  };
}

/** Base reactivation pipeline — shown on first render. */
export function createBaseNodes(): WorkflowNode[] {
  return [
    makeNode("signals", "Сигналы", "default",   0,    0, "источник"),
    makeNode("split",   "Сплит",   "split",    200,   0, "HL / L / M"),
    makeNode("push",    "Push",    "channel",  400, -80),
    makeNode("email",   "Email",   "channel",  400,   0),
    makeNode("sms",     "SMS",     "channel",  400,  80),
    makeNode("check",   "Проверка","default",  600,   0, "отклик"),
    makeNode("engaged", "Engaged", "result",   800, -40, "YES"),
    makeNode("retarget","Retarget","retarget", 800,  40, "NO"),
    makeNode("result",  "Результат","result", 1000,   0),
  ];
}

export function createBaseEdges(): WorkflowEdge[] {
  return [
    makeEdge("signals", "split"),
    makeEdge("split",   "push"),
    makeEdge("split",   "email"),
    makeEdge("split",   "sms"),
    makeEdge("push",    "check"),
    makeEdge("email",   "check"),
    makeEdge("sms",     "check"),
    makeEdge("check",   "engaged"),
    makeEdge("check",   "retarget"),
    makeEdge("engaged", "result"),
    makeEdge("retarget","result"),
  ];
}

/** Shift all nodes whose x >= fromX rightward by amount. */
function shiftRight(
  nodes: WorkflowNode[],
  fromX: number,
  amount: number
): WorkflowNode[] {
  return nodes.map((n) =>
    n.position.x >= fromX
      ? { ...n, position: { ...n.position, x: n.position.x + amount } }
      : n
  );
}

/**
 * Parse a natural-language command and return an updater function,
 * or null when the command is not recognised.
 */
export function parseWorkflowCommand(msg: string): CommandUpdater | null {
  const lower = msg.toLowerCase();

  // 1. Remove SMS channel
  if (lower.includes("убери sms") || lower.includes("удали sms") || lower.includes("убрать sms")) {
    return (nodes, edges) => ({
      nodes: nodes.filter((n) => n.id !== "sms"),
      edges: edges.filter((e) => e.source !== "sms" && e.target !== "sms"),
    });
  }

  // 2. Add activity filter before split
  if (lower.includes("добавь фильтр") || lower.includes("фильтр активности") || lower.includes("добавить фильтр")) {
    return (nodes, edges) => {
      if (nodes.find((n) => n.id === "filter")) return { nodes, edges }; // idempotent
      const signalsNode = nodes.find((n) => n.id === "signals")!;
      const filterX = signalsNode.position.x + 200;
      const shifted = shiftRight(nodes, filterX, 200);
      const filterNode = makeNode(
        "filter", "Фильтр 24ч", "new", filterX, signalsNode.position.y
      );
      const newEdges = edges.filter(
        (e) => !(e.source === "signals" && e.target === "split")
      );
      newEdges.push(makeEdge("signals", "filter"), makeEdge("filter", "split"));
      return { nodes: [...shifted, filterNode], edges: newEdges };
    };
  }

  // 3. Add delay in retarget branch
  if (lower.includes("добавь задержку") || lower.includes("задержка") || lower.includes("delay")) {
    return (nodes, edges) => {
      if (nodes.find((n) => n.id === "delay")) return { nodes, edges };
      const retargetNode = nodes.find((n) => n.id === "retarget")!;
      const resultNode   = nodes.find((n) => n.id === "result")!;
      const delayX = (retargetNode.position.x + resultNode.position.x) / 2;
      const delayNode = makeNode(
        "delay", "Задержка 24ч", "new", delayX, retargetNode.position.y
      );
      const newEdges = edges.filter(
        (e) => !(e.source === "retarget" && e.target === "result")
      );
      newEdges.push(makeEdge("retarget", "delay"), makeEdge("delay", "result"));
      return { nodes: [...nodes, delayNode], edges: newEdges };
    };
  }

  // 4. Add email-opened condition inside engaged branch
  if (
    lower.includes("условие email") ||
    lower.includes("email открыт") ||
    lower.includes("добавь условие")
  ) {
    return (nodes, edges) => {
      if (nodes.find((n) => n.id === "email-condition")) return { nodes, edges };
      const engagedNode = nodes.find((n) => n.id === "engaged")!;
      const resultNode  = nodes.find((n) => n.id === "result")!;
      const condX = (engagedNode.position.x + resultNode.position.x) / 2;
      const condNode = makeNode(
        "email-condition", "Email открыт?", "new", condX, engagedNode.position.y
      );
      const newEdges = edges.filter(
        (e) => !(e.source === "engaged" && e.target === "result")
      );
      newEdges.push(
        makeEdge("engaged", "email-condition"),
        makeEdge("email-condition", "result")
      );
      return { nodes: [...nodes, condNode], edges: newEdges };
    };
  }

  return null;
}
