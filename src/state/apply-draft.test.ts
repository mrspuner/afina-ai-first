import { describe, it, expect, vi } from "vitest";
import { applyDraftToNode } from "./apply-draft";
import type { NodeTagPayload, PromptChip } from "./prompt-chips-context";

/** Чип тега AI-поля: label — имя поля, payload несёт надёжный nodeId. */
function nodeFieldChip(nodeId: string, paramLabel: string): PromptChip {
  const payload: NodeTagPayload = {
    nodeId,
    nodeType: "email",
    color: "#ffffff",
    paramLabel,
  };
  return {
    id: `nodefield_${nodeId}_${paramLabel}`,
    kind: "node",
    label: paramLabel,
    payload,
    removable: true,
  };
}

describe("applyDraftToNode", () => {
  it("node-field chip → dispatches workflow_node_command_submit carrying the node's nodeId", () => {
    const dispatch = vi.fn();
    // label is the FIELD name ("Текст") — it would never match a node label.
    const chip = nodeFieldChip("node_abc", "Текст");

    applyDraftToNode(dispatch, chip, "сделай дружелюбнее");

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: "workflow_node_command_submit",
      commands: [
        { nodeId: "node_abc", nodeLabel: "Текст", text: "сделай дружелюбнее" },
      ],
    });
  });

  it("whole-node chip (no paramLabel) → still dispatches with the node's nodeId", () => {
    const dispatch = vi.fn();
    const payload: NodeTagPayload = {
      nodeId: "node_sms",
      nodeType: "sms",
      color: "#abcdef",
      // paramLabel absent → whole-node tag
    };
    const chip: PromptChip = {
      id: "node_node_sms",
      kind: "node",
      label: "SMS",
      payload,
      removable: true,
    };

    applyDraftToNode(dispatch, chip, "текст: привет");

    expect(dispatch).toHaveBeenCalledWith({
      type: "workflow_node_command_submit",
      commands: [{ nodeId: "node_sms", nodeLabel: "SMS", text: "текст: привет" }],
    });
  });

  it("blank text → no-op (no dispatch)", () => {
    const dispatch = vi.fn();
    const chip = nodeFieldChip("node_abc", "Текст");

    applyDraftToNode(dispatch, chip, "   ");

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("non-node payload → no-op (no dispatch)", () => {
    const dispatch = vi.fn();
    const chip: PromptChip = {
      id: "trigger_1",
      kind: "trigger",
      label: "Ипотека",
      payload: { someTrigger: "data" },
      removable: true,
    };

    applyDraftToNode(dispatch, chip, "непустой текст");

    expect(dispatch).not.toHaveBeenCalled();
  });
});
