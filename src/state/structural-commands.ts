import type { WorkflowNodeType } from "@/types/workflow";

export type Placement =
  | { mode: "after"; ref: string }
  | { mode: "before"; ref: string }
  | { mode: "between"; refA: string; refB: string }
  | { mode: "auto" };

export type StructuralOp =
  | {
      kind: "add";
      nodeType: WorkflowNodeType;
      placement: Placement;
      inlineParams?: string;
    }
  | { kind: "remove"; ref: string }
  | {
      kind: "replace";
      ref: string;
      newType: WorkflowNodeType;
      inlineParams?: string;
    };

const TYPE_LOOKUP: Record<string, WorkflowNodeType> = {
  "смс": "sms",
  "sms": "sms",
  "email": "email",
  "почта": "email",
  "push": "push",
  "пуш": "push",
  "звонок": "ivr",
  "ivr": "ivr",
  "задержка": "wait",
  "ожидание": "wait",
  "витрина": "storefront",
  "лендинг": "landing",
  "успех": "success",
  "конец": "end",
};

const ADD_VERBS = /^(добавь|добавить|вставь|вставить)$/i;
const REMOVE_VERBS = /^(убери|убрать|удали|удалить)$/i;
const REPLACE_VERBS = /^(замени|заменить)$/i;

function findType(word: string): WorkflowNodeType | null {
  return TYPE_LOOKUP[word.toLowerCase()] ?? null;
}

/**
 * Split prompt into top-level segments by . , ; or " и ".
 * @-tag segments end on comma/semicolon/period/newline — at that point
 * the user switched context. Structural verbs INSIDE @-segments are
 * content, not commands.
 */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "." || ch === "," || ch === ";" || ch === "\n") {
      if (current.trim()) parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  // Further split by " и " ONLY in non-@ segments AND only when the
  // segment does not contain "между" (where ` и ` is part of the phrase
  // "между X и Y").
  const finalParts: string[] = [];
  for (const p of parts) {
    if (p.startsWith("@")) {
      finalParts.push(p);
      continue;
    }
    if (/(^|\s)между(\s|$)/i.test(p)) {
      finalParts.push(p);
      continue;
    }
    const subs = p
      .split(/\s+и\s+/i)
      .map((s) => s.trim())
      .filter(Boolean);
    finalParts.push(...subs);
  }
  return finalParts;
}

/**
 * Look at trailing tokens for placement keywords. Returns placement + leftover params text.
 */
function extractPlacement(tokens: string[]): {
  placement: Placement;
  paramsText: string;
} {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i].toLowerCase();
    if (tok === "после") {
      const ref = tokens.slice(i + 1).join(" ").trim();
      return {
        placement: { mode: "after", ref },
        paramsText: tokens.slice(0, i).join(" "),
      };
    }
    if (tok === "перед") {
      const ref = tokens.slice(i + 1).join(" ").trim();
      return {
        placement: { mode: "before", ref },
        paramsText: tokens.slice(0, i).join(" "),
      };
    }
    if (tok === "между") {
      const between = tokens.slice(i + 1);
      const iIdx = between.findIndex((t) => t.toLowerCase() === "и");
      if (iIdx === -1) continue;
      const refA = between.slice(0, iIdx).join(" ").trim();
      const refB = between.slice(iIdx + 1).join(" ").trim();
      return {
        placement: { mode: "between", refA, refB },
        paramsText: tokens.slice(0, i).join(" "),
      };
    }
  }
  return { placement: { mode: "auto" }, paramsText: tokens.join(" ") };
}

/**
 * Parse one segment as a structural op. Returns null if not structural.
 */
function parseSegment(segment: string): StructuralOp | null {
  const trimmed = segment.trim();
  if (trimmed.startsWith("@")) return null;
  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) return null;
  const verb = tokens[0];

  // ADD: <verb> <type> [...inline params...] [<placement>]
  if (ADD_VERBS.test(verb)) {
    const nodeType = findType(tokens[1]);
    if (!nodeType) return null;
    const rest = tokens.slice(2);
    const { placement, paramsText } = extractPlacement(rest);
    return {
      kind: "add",
      nodeType,
      placement,
      inlineParams: paramsText.trim() || undefined,
    };
  }

  // REMOVE: <verb> <ref...>
  if (REMOVE_VERBS.test(verb)) {
    const ref = tokens.slice(1).join(" ").trim();
    if (!ref) return null;
    return { kind: "remove", ref };
  }

  // REPLACE: <verb> <ref> на <type> [...inline params...]
  if (REPLACE_VERBS.test(verb)) {
    const naIdx = tokens.findIndex((t) => t.toLowerCase() === "на");
    if (naIdx === -1 || naIdx === 1 || naIdx === tokens.length - 1) return null;
    const ref = tokens.slice(1, naIdx).join(" ");
    const nodeType = findType(tokens[naIdx + 1]);
    if (!nodeType) return null;
    const inlineParams =
      tokens.slice(naIdx + 2).join(" ").trim() || undefined;
    return { kind: "replace", ref, newType: nodeType, inlineParams };
  }

  return null;
}

export function parseStructuralCommands(input: string): {
  ops: StructuralOp[];
  unrecognized: string[];
} {
  const segments = splitTopLevel(input);
  const ops: StructuralOp[] = [];
  const unrecognized: string[] = [];
  for (const seg of segments) {
    if (seg.startsWith("@")) continue;
    const op = parseSegment(seg);
    if (op) ops.push(op);
    else if (seg.trim().length > 0) unrecognized.push(seg);
  }
  return { ops, unrecognized };
}
