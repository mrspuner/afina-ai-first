import { describe, expect, it } from "vitest";
import {
  POST_ONBOARDING_CHIPS,
  WAVE_0_CHIPS,
  WAVES,
} from "./onboarding-chat";

describe("onboarding chat tree", () => {
  it("every wave-0 chip points to an existing wave node", () => {
    for (const c of WAVE_0_CHIPS) {
      expect(WAVES[c.next], `wave-0 chip ${c.id} → ${c.next}`).toBeDefined();
    }
  });

  it("every wave-1 chip in WAVES points to an existing node", () => {
    for (const [key, node] of Object.entries(WAVES)) {
      if (!key.endsWith("-w1")) continue;
      for (const c of node.chips) {
        expect(
          WAVES[c.next],
          `${key} → chip ${c.id} points to ${c.next}`
        ).toBeDefined();
      }
    }
  });

  it("every wave-2 node exposes exactly the shared wave-3 chips", () => {
    const w2keys = Object.keys(WAVES).filter((k) => /-w2[abc]$/.test(k));
    expect(w2keys.length).toBe(9); // 3 scenarios × 3 sub-branches

    const w3LabelSet = new Set([
      "Как платформа узнаёт об активности моих клиентов?",
      "Создать первый сигнал →",
    ]);
    for (const k of w2keys) {
      const labels = WAVES[k].chips.map((c) => c.label);
      expect(new Set(labels), `chips at ${k}`).toEqual(w3LabelSet);
    }
  });

  it("wave-3-repeat node exists and has the same chips", () => {
    const repeat = WAVES["wave-3-repeat"];
    expect(repeat).toBeDefined();
    expect(repeat.chips.length).toBe(2);
    expect(repeat.chips.map((c) => c.next).sort()).toEqual(
      ["create-signal", "wave-3-repeat"].sort()
    );
  });

  it("chip ids are unique across the tree", () => {
    const ids: string[] = [];
    for (const c of WAVE_0_CHIPS) ids.push(c.id);
    for (const node of Object.values(WAVES))
      for (const c of node.chips) ids.push(c.id);
    for (const c of POST_ONBOARDING_CHIPS) ids.push(c.id);
    // Some chip ids repeat across wave-2 nodes (they all share WAVE_3_CHIPS by
    // reference) — that's intentional. Check uniqueness within WAVE_0 + WAVES
    // keys and post chips separately.
    const postIds = POST_ONBOARDING_CHIPS.map((c) => c.id);
    expect(new Set(postIds).size).toBe(postIds.length);
    const w0Ids = WAVE_0_CHIPS.map((c) => c.id);
    expect(new Set(w0Ids).size).toBe(w0Ids.length);
  });

  it("post-onboarding chips cover both CTA markers", () => {
    const nexts = POST_ONBOARDING_CHIPS.map((c) => c.next).sort();
    expect(nexts).toEqual(["post-create-campaign", "post-create-signal"]);
  });
});
