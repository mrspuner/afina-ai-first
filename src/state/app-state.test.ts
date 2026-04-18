import { describe, it, expect } from "vitest";
import { appReducer, initialState, type AppState, type Signal, type Campaign } from "./app-state";

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "sig_1",
    type: "Регистрация",
    count: 1000,
    segments: { max: 100, high: 300, mid: 400, low: 200 },
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "cmp_1",
    name: "Campaign 1",
    signalId: "sig_1",
    status: "draft",
    createdAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("appReducer — initial state", () => {
  it("has empty signals and campaigns arrays", () => {
    expect(initialState.signals).toEqual([]);
    expect(initialState.campaigns).toEqual([]);
  });

  it("starts on welcome view", () => {
    expect(initialState.view).toEqual({ kind: "welcome" });
  });
});

describe("appReducer — signal_added", () => {
  it("appends a signal to the array", () => {
    const signal = makeSignal();
    const next = appReducer(initialState, { type: "signal_added", signal });
    expect(next.signals).toHaveLength(1);
    expect(next.signals[0]).toEqual(signal);
  });

  it("preserves existing signals", () => {
    const first = makeSignal({ id: "sig_1" });
    const second = makeSignal({ id: "sig_2", type: "Апсейл" });
    const state1 = appReducer(initialState, { type: "signal_added", signal: first });
    const state2 = appReducer(state1, { type: "signal_added", signal: second });
    expect(state2.signals).toEqual([first, second]);
  });

  it("does not touch campaigns", () => {
    const signal = makeSignal();
    const next = appReducer(initialState, { type: "signal_added", signal });
    expect(next.campaigns).toEqual([]);
  });
});

describe("appReducer — campaign_created", () => {
  it("appends a campaign to the array", () => {
    const campaign = makeCampaign();
    const next = appReducer(initialState, { type: "campaign_created", campaign });
    expect(next.campaigns).toHaveLength(1);
    expect(next.campaigns[0]).toEqual(campaign);
  });

  it("flips view.launched when active campaign matches workflow view", () => {
    const state: AppState = {
      ...initialState,
      view: { kind: "workflow", campaign: { id: "c1", name: "C1" }, launched: false },
    };
    const campaign = makeCampaign({ id: "c1", status: "active" });
    const next = appReducer(state, { type: "campaign_created", campaign });
    expect(next.view).toEqual({
      kind: "workflow",
      campaign: { id: "c1", name: "C1" },
      launched: true,
    });
  });

  it("does not flip view.launched when campaign id differs", () => {
    const state: AppState = {
      ...initialState,
      view: { kind: "workflow", campaign: { id: "c1", name: "C1" }, launched: false },
    };
    const campaign = makeCampaign({ id: "other", status: "active" });
    const next = appReducer(state, { type: "campaign_created", campaign });
    expect(next.view.kind).toBe("workflow");
    if (next.view.kind === "workflow") {
      expect(next.view.launched).toBe(false);
    }
  });
});

describe("appReducer — campaign_status_changed", () => {
  it("updates status and sets launchedAt when moving to active", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [makeCampaign({ id: "c1", status: "draft" })],
    };
    const next = appReducer(state, {
      type: "campaign_status_changed",
      id: "c1",
      status: "active",
      timestamp: "2026-04-18T12:00:00.000Z",
    });
    expect(next.campaigns[0].status).toBe("active");
    expect(next.campaigns[0].launchedAt).toBe("2026-04-18T12:00:00.000Z");
  });

  it("sets completedAt when moving to completed", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [makeCampaign({ id: "c1", status: "active" })],
    };
    const next = appReducer(state, {
      type: "campaign_status_changed",
      id: "c1",
      status: "completed",
      timestamp: "2026-04-18T12:00:00.000Z",
    });
    expect(next.campaigns[0].status).toBe("completed");
    expect(next.campaigns[0].completedAt).toBe("2026-04-18T12:00:00.000Z");
  });

  it("does not mutate other campaigns", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [
        makeCampaign({ id: "c1", status: "draft" }),
        makeCampaign({ id: "c2", status: "draft" }),
      ],
    };
    const next = appReducer(state, {
      type: "campaign_status_changed",
      id: "c1",
      status: "scheduled",
      timestamp: "2026-04-18T12:00:00.000Z",
    });
    expect(next.campaigns[1].status).toBe("draft");
  });
});

describe("appReducer — preset_applied", () => {
  it("replaces signals and campaigns", () => {
    const state: AppState = {
      ...initialState,
      signals: [makeSignal({ id: "old" })],
      campaigns: [makeCampaign({ id: "old-cmp" })],
    };
    const preset = {
      key: "mid" as const,
      label: "Mid",
      signals: [makeSignal({ id: "new-1" }), makeSignal({ id: "new-2" })],
      campaigns: [makeCampaign({ id: "new-cmp" })],
    };
    const next = appReducer(state, { type: "preset_applied", preset });
    expect(next.signals.map((s) => s.id)).toEqual(["new-1", "new-2"]);
    expect(next.campaigns.map((c) => c.id)).toEqual(["new-cmp"]);
  });

  it("preserves view when current view is welcome", () => {
    const preset = { key: "mid" as const, label: "Mid", signals: [], campaigns: [] };
    const next = appReducer(initialState, { type: "preset_applied", preset });
    expect(next.view).toEqual({ kind: "welcome" });
  });

  it("falls back to section Кампании when current workflow view references non-existent campaign", () => {
    const state: AppState = {
      ...initialState,
      view: { kind: "workflow", campaign: { id: "gone", name: "Gone" }, launched: false },
      campaigns: [makeCampaign({ id: "gone" })],
    };
    const preset = {
      key: "empty" as const,
      label: "Empty",
      signals: [],
      campaigns: [],
    };
    const next = appReducer(state, { type: "preset_applied", preset });
    expect(next.view).toEqual({ kind: "section", name: "Кампании" });
  });

  it("keeps workflow view when campaign still exists in new preset", () => {
    const kept = makeCampaign({ id: "kept" });
    const state: AppState = {
      ...initialState,
      view: { kind: "workflow", campaign: { id: "kept", name: "Kept" }, launched: false },
    };
    const preset = {
      key: "mid" as const,
      label: "Mid",
      signals: [],
      campaigns: [kept],
    };
    const next = appReducer(state, { type: "preset_applied", preset });
    expect(next.view.kind).toBe("workflow");
  });

  it("does not touch workflowCommand or launchFlyoutOpen", () => {
    const state: AppState = {
      ...initialState,
      workflowCommand: "some-command",
      launchFlyoutOpen: true,
    };
    const preset = { key: "empty" as const, label: "Empty", signals: [], campaigns: [] };
    const next = appReducer(state, { type: "preset_applied", preset });
    expect(next.workflowCommand).toBe("some-command");
    expect(next.launchFlyoutOpen).toBe(true);
  });
});
