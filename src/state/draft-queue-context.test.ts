import { describe, it, expect } from "vitest";
import {
  draftQueueReducer,
  type DraftQueueState,
} from "./draft-queue-context";
import type { PromptChip } from "./prompt-chips-context";

const empty: DraftQueueState = { drafts: [] };

function chip(id: string, label = "Текст"): PromptChip {
  return {
    id,
    kind: "node",
    label,
    payload: { nodeId: id, nodeType: "sms", color: "#5eead4", paramLabel: label },
    removable: true,
  };
}

describe("draftQueueReducer", () => {
  it("park adds a draft with chip + text", () => {
    const next = draftQueueReducer(empty, {
      type: "park", id: "d1", chip: chip("nodefield_n1_Текст"), text: "сделай дружелюбнее",
    });
    expect(next.drafts).toHaveLength(1);
    expect(next.drafts[0].id).toBe("d1");
    expect(next.drafts[0].text).toBe("сделай дружелюбнее");
  });

  it("park dedupes by chip.id — re-parking the same tag replaces its draft", () => {
    let s = draftQueueReducer(empty, {
      type: "park", id: "d1", chip: chip("nodefield_n1_Текст"), text: "первый",
    });
    s = draftQueueReducer(s, {
      type: "park", id: "d2", chip: chip("nodefield_n1_Текст"), text: "переписал",
    });
    expect(s.drafts).toHaveLength(1);
    expect(s.drafts[0].text).toBe("переписал");
  });

  it("park keeps drafts for different chips side by side", () => {
    let s = draftQueueReducer(empty, {
      type: "park", id: "d1", chip: chip("nodefield_n1_Текст"), text: "a",
    });
    s = draftQueueReducer(s, {
      type: "park", id: "d2", chip: chip("nodefield_n2_Тема"), text: "b",
    });
    expect(s.drafts).toHaveLength(2);
  });

  it("park with empty text is a no-op (nothing to queue)", () => {
    const s = draftQueueReducer(empty, {
      type: "park", id: "d1", chip: chip("nodefield_n1_Текст"), text: "   ",
    });
    expect(s).toBe(empty);
  });

  it("remove drops a draft by id", () => {
    const s = draftQueueReducer(empty, {
      type: "park", id: "d1", chip: chip("nodefield_n1_Текст"), text: "a",
    });
    const after = draftQueueReducer(s, { type: "remove", id: "d1" });
    expect(after.drafts).toEqual([]);
  });

  it("clear empties the queue", () => {
    const s = draftQueueReducer(empty, {
      type: "park", id: "d1", chip: chip("nodefield_n1_Текст"), text: "a",
    });
    expect(draftQueueReducer(s, { type: "clear" }).drafts).toEqual([]);
  });

  it("clear on an empty queue returns the same reference", () => {
    expect(draftQueueReducer(empty, { type: "clear" })).toBe(empty);
  });
});

describe("draftQueueReducer — A → B sequence (block-E semantics)", () => {
  it("A with text → B: A is parked (one draft), order preserved", () => {
    // Парковка А с текстом перед добавлением B (B-парковка не вызывается —
    // у B ещё нет текста). Очередь: 1 черновик A.
    const s = draftQueueReducer(empty, {
      type: "park",
      id: "d1",
      chip: chip("nodefield_A_Текст"),
      text: "сделай дружелюбнее",
    });
    expect(s.drafts).toHaveLength(1);
    expect(s.drafts[0].chip.id).toBe("nodefield_A_Текст");
    expect(s.drafts[0].text).toBe("сделай дружелюбнее");
  });

  it("A without text → B: parkDraft is a no-op, queue stays empty", () => {
    // Если у А не было текста, парковщик вызывает parkDraft со строкой "".
    // Reducer должен вернуть тот же state (no-op) — A не сохраняется в очереди.
    const s = draftQueueReducer(empty, {
      type: "park",
      id: "d1",
      chip: chip("nodefield_A_Текст"),
      text: "",
    });
    expect(s).toBe(empty);
    expect(s.drafts).toEqual([]);
  });

  it("A with text, B with text → both parked in order", () => {
    let s = draftQueueReducer(empty, {
      type: "park",
      id: "d1",
      chip: chip("nodefield_A_Текст"),
      text: "первый",
    });
    s = draftQueueReducer(s, {
      type: "park",
      id: "d2",
      chip: chip("nodefield_B_Тема"),
      text: "второй",
    });
    expect(s.drafts.map((d) => d.chip.id)).toEqual([
      "nodefield_A_Текст",
      "nodefield_B_Тема",
    ]);
    expect(s.drafts.map((d) => d.text)).toEqual(["первый", "второй"]);
  });

  it("A with text then A re-parked with empty text: original draft stays", () => {
    // Edge case: defensive guard. Re-park с пустым текстом — no-op,
    // существующий draft A не должен быть стёрт.
    let s = draftQueueReducer(empty, {
      type: "park",
      id: "d1",
      chip: chip("nodefield_A_Текст"),
      text: "сохрани меня",
    });
    s = draftQueueReducer(s, {
      type: "park",
      id: "d2",
      chip: chip("nodefield_A_Текст"),
      text: "",
    });
    expect(s.drafts).toHaveLength(1);
    expect(s.drafts[0].text).toBe("сохрани меня");
  });
});
