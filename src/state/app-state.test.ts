import { describe, it, expect } from "vitest";
import {
  appReducer,
  initialState,
  isCampaignDone,
  type AppState,
  type Signal,
  type Campaign,
} from "./app-state";

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

describe("appReducer — campaign_from_signal", () => {
  it("creates a new draft campaign tied to the signal", () => {
    const signal = makeSignal({ id: "sig_A", type: "Апсейл" });
    const state: AppState = { ...initialState, signals: [signal] };
    const next = appReducer(state, { type: "campaign_from_signal", signalId: "sig_A" });
    expect(next.campaigns).toHaveLength(1);
    const c = next.campaigns[0];
    expect(c.signalId).toBe("sig_A");
    expect(c.status).toBe("draft");
    expect(c.name).toBe("Апсейл #1");
    expect(c.id).toMatch(/^cmp_/);
    expect(typeof c.createdAt).toBe("string");
  });

  it("numbers the second campaign per signal as #2", () => {
    const signal = makeSignal({ id: "sig_A", type: "Апсейл" });
    const existing = makeCampaign({ id: "cmp_old", signalId: "sig_A", name: "Апсейл #1" });
    const state: AppState = { ...initialState, signals: [signal], campaigns: [existing] };
    const next = appReducer(state, { type: "campaign_from_signal", signalId: "sig_A" });
    expect(next.campaigns).toHaveLength(2);
    expect(next.campaigns[1].name).toBe("Апсейл #2");
  });

  it("navigates to workflow view with launched=false", () => {
    const signal = makeSignal({ id: "sig_A" });
    const state: AppState = { ...initialState, signals: [signal] };
    const next = appReducer(state, { type: "campaign_from_signal", signalId: "sig_A" });
    expect(next.view.kind).toBe("workflow");
    if (next.view.kind !== "workflow") throw new Error("unreachable");
    expect(next.view.launched).toBe(false);
    expect(next.view.campaign.id).toBe(next.campaigns[0].id);
    expect(next.view.campaign.name).toBe("Регистрация #1");
  });

  it("is a no-op when signalId is unknown", () => {
    const state: AppState = { ...initialState, signals: [makeSignal({ id: "sig_A" })] };
    const next = appReducer(state, { type: "campaign_from_signal", signalId: "sig_unknown" });
    expect(next).toBe(state);
  });

  it("clears activeSection so the workflow fills the pane", () => {
    const state: AppState = {
      ...initialState,
      signals: [makeSignal({ id: "sig_A" })],
      activeSection: "Сигналы",
    };
    const next = appReducer(state, { type: "campaign_from_signal", signalId: "sig_A" });
    expect(next.activeSection).toBeNull();
  });
});

describe("appReducer — campaign_renamed", () => {
  it("updates name on the matching campaign", () => {
    const c = makeCampaign({ id: "cmp_A", name: "Original" });
    const state: AppState = { ...initialState, campaigns: [c] };
    const next = appReducer(state, { type: "campaign_renamed", id: "cmp_A", name: "New name" });
    expect(next.campaigns[0].name).toBe("New name");
  });

  it("trims whitespace", () => {
    const c = makeCampaign({ id: "cmp_A", name: "Original" });
    const state: AppState = { ...initialState, campaigns: [c] };
    const next = appReducer(state, { type: "campaign_renamed", id: "cmp_A", name: "  Trimmed  " });
    expect(next.campaigns[0].name).toBe("Trimmed");
  });

  it("is a no-op when id is unknown", () => {
    const state: AppState = { ...initialState, campaigns: [makeCampaign({ id: "cmp_A" })] };
    const next = appReducer(state, { type: "campaign_renamed", id: "cmp_missing", name: "x" });
    expect(next).toBe(state);
  });

  it("is a no-op when name is empty after trim", () => {
    const state: AppState = { ...initialState, campaigns: [makeCampaign({ id: "cmp_A" })] };
    const next = appReducer(state, { type: "campaign_renamed", id: "cmp_A", name: "   " });
    expect(next).toBe(state);
  });

  it("updates view.campaign.name when workflow view points to the same id", () => {
    const c = makeCampaign({ id: "cmp_A", name: "Original" });
    const state: AppState = {
      ...initialState,
      campaigns: [c],
      view: { kind: "workflow", campaign: { id: "cmp_A", name: "Original" }, launched: false },
    };
    const next = appReducer(state, { type: "campaign_renamed", id: "cmp_A", name: "Next" });
    if (next.view.kind !== "workflow") throw new Error("unreachable");
    expect(next.view.campaign.name).toBe("Next");
  });

  it("does not update view when workflow view points to a different id", () => {
    const target = makeCampaign({ id: "cmp_A" });
    const other = makeCampaign({ id: "cmp_B", name: "Other" });
    const state: AppState = {
      ...initialState,
      campaigns: [target, other],
      view: { kind: "workflow", campaign: { id: "cmp_B", name: "Other" }, launched: false },
    };
    const next = appReducer(state, { type: "campaign_renamed", id: "cmp_A", name: "Next" });
    if (next.view.kind !== "workflow") throw new Error("unreachable");
    expect(next.view.campaign.name).toBe("Other");
  });
});

describe("appReducer — campaign_saved_draft", () => {
  it("returns the same state reference (no-op)", () => {
    const state: AppState = { ...initialState, campaigns: [makeCampaign({ id: "cmp_A" })] };
    const next = appReducer(state, { type: "campaign_saved_draft", id: "cmp_A" });
    expect(next).toBe(state);
  });
});

describe("appReducer — workflow node selection + AI cycle", () => {
  it("workflow_node_selected stores id and label", () => {
    const next = appReducer(initialState, {
      type: "workflow_node_selected",
      id: "email",
      label: "Email",
    });
    expect(next.selectedWorkflowNode).toEqual({ id: "email", label: "Email" });
  });

  it("workflow_node_deselected clears the selection", () => {
    const state: AppState = {
      ...initialState,
      selectedWorkflowNode: { id: "x", label: "X" },
    };
    const next = appReducer(state, { type: "workflow_node_deselected" });
    expect(next.selectedWorkflowNode).toBeNull();
  });

  it("workflow_node_command_submit captures the batch and deselects", () => {
    const state: AppState = {
      ...initialState,
      selectedWorkflowNode: { id: "email", label: "Email" },
    };
    const next = appReducer(state, {
      type: "workflow_node_command_submit",
      commands: [{ nodeLabel: "Email", text: "Задержка 2 часа" }],
    });
    expect(next.workflowNodeCommand).toEqual({
      commands: [{ nodeLabel: "Email", text: "Задержка 2 часа" }],
    });
    expect(next.selectedWorkflowNode).toBeNull();
  });

  it("workflow_node_command_submit accepts multi-node batch", () => {
    const next = appReducer(initialState, {
      type: "workflow_node_command_submit",
      commands: [
        { nodeLabel: "СМС", text: "текст: привет" },
        { nodeLabel: "Email", text: "тема: скидка" },
      ],
    });
    expect(next.workflowNodeCommand?.commands).toHaveLength(2);
  });

  it("workflow_node_command_handled clears the pending command", () => {
    const state: AppState = {
      ...initialState,
      workflowNodeCommand: {
        commands: [{ nodeLabel: "Email", text: "x" }],
      },
    };
    const next = appReducer(state, { type: "workflow_node_command_handled" });
    expect(next.workflowNodeCommand).toBeNull();
  });

  it("ai_reply_shown stores the text", () => {
    const next = appReducer(initialState, { type: "ai_reply_shown", text: "Готово" });
    expect(next.aiReply).toBe("Готово");
  });

  it("ai_reply_dismissed clears the text", () => {
    const state: AppState = { ...initialState, aiReply: "Hello" };
    const next = appReducer(state, { type: "ai_reply_dismissed" });
    expect(next.aiReply).toBeNull();
  });
});

describe("appReducer — campaign_opened", () => {
  it("opens draft campaign in workflow view with launched=false", () => {
    const c = makeCampaign({ id: "cmp_A", name: "Draft A", status: "draft" });
    const state: AppState = { ...initialState, campaigns: [c] };
    const next = appReducer(state, { type: "campaign_opened", id: "cmp_A" });
    expect(next.view).toEqual({
      kind: "workflow",
      campaign: { id: "cmp_A", name: "Draft A" },
      launched: false,
    });
  });

  it("opens active campaign with launched=true", () => {
    const c = makeCampaign({ id: "cmp_A", name: "Running", status: "active" });
    const state: AppState = { ...initialState, campaigns: [c] };
    const next = appReducer(state, { type: "campaign_opened", id: "cmp_A" });
    if (next.view.kind !== "workflow") throw new Error("unreachable");
    expect(next.view.launched).toBe(true);
  });

  it("opens completed campaign with launched=true", () => {
    const c = makeCampaign({ id: "cmp_A", name: "Done", status: "completed" });
    const state: AppState = { ...initialState, campaigns: [c] };
    const next = appReducer(state, { type: "campaign_opened", id: "cmp_A" });
    if (next.view.kind !== "workflow") throw new Error("unreachable");
    expect(next.view.launched).toBe(true);
  });

  it("opens scheduled campaign with launched=false", () => {
    const c = makeCampaign({ id: "cmp_A", name: "Plan", status: "scheduled" });
    const state: AppState = { ...initialState, campaigns: [c] };
    const next = appReducer(state, { type: "campaign_opened", id: "cmp_A" });
    if (next.view.kind !== "workflow") throw new Error("unreachable");
    expect(next.view.launched).toBe(false);
  });

  it("is a no-op when id is unknown", () => {
    const state: AppState = { ...initialState, campaigns: [makeCampaign()] };
    const next = appReducer(state, { type: "campaign_opened", id: "cmp_missing" });
    expect(next).toBe(state);
  });

  it("clears activeSection so the workflow fills the pane", () => {
    const c = makeCampaign({ id: "cmp_A" });
    const state: AppState = {
      ...initialState,
      campaigns: [c],
      activeSection: "Кампании",
    };
    const next = appReducer(state, { type: "campaign_opened", id: "cmp_A" });
    expect(next.activeSection).toBeNull();
  });
});

describe("appReducer — paused transitions", () => {
  it("active → paused sets pausedAt and preserves launchedAt", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [
        makeCampaign({
          id: "c1",
          status: "active",
          launchedAt: "2026-03-01T00:00:00.000Z",
        }),
      ],
    };
    const next = appReducer(state, {
      type: "campaign_status_changed",
      id: "c1",
      status: "paused",
      timestamp: "2026-04-18T12:00:00.000Z",
    });
    expect(next.campaigns[0].status).toBe("paused");
    expect(next.campaigns[0].pausedAt).toBe("2026-04-18T12:00:00.000Z");
    expect(next.campaigns[0].launchedAt).toBe("2026-03-01T00:00:00.000Z");
  });

  it("paused → active clears pausedAt but keeps launchedAt", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [
        makeCampaign({
          id: "c1",
          status: "paused",
          launchedAt: "2026-03-01T00:00:00.000Z",
          pausedAt: "2026-04-10T00:00:00.000Z",
        }),
      ],
    };
    const next = appReducer(state, {
      type: "campaign_status_changed",
      id: "c1",
      status: "active",
      timestamp: "2026-04-18T12:00:00.000Z",
    });
    expect(next.campaigns[0].status).toBe("active");
    expect(next.campaigns[0].pausedAt).toBeUndefined();
    expect(next.campaigns[0].launchedAt).toBe("2026-03-01T00:00:00.000Z");
  });

  it("keeps view.launched true when workflow view transitions into paused", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [
        makeCampaign({
          id: "c1",
          status: "active",
          launchedAt: "2026-03-01T00:00:00.000Z",
        }),
      ],
      view: { kind: "workflow", campaign: { id: "c1", name: "C1" }, launched: true },
    };
    const next = appReducer(state, {
      type: "campaign_status_changed",
      id: "c1",
      status: "paused",
      timestamp: "2026-04-18T12:00:00.000Z",
    });
    if (next.view.kind !== "workflow") throw new Error("unreachable");
    expect(next.view.launched).toBe(true);
  });
});

describe("appReducer — campaign_duplicated", () => {
  it("creates a draft copy named with 'Копия —' prefix", () => {
    const original = makeCampaign({
      id: "cmp_orig",
      name: "Летний апсейл",
      status: "active",
    });
    const state: AppState = { ...initialState, campaigns: [original] };
    const next = appReducer(state, { type: "campaign_duplicated", id: "cmp_orig" });
    expect(next.campaigns).toHaveLength(2);
    const dup = next.campaigns[1];
    expect(dup.name).toBe("Копия — Летний апсейл");
    expect(dup.status).toBe("draft");
    expect(dup.signalId).toBe(original.signalId);
    expect(dup.id).not.toBe(original.id);
    expect(dup.id).toMatch(/^cmp_/);
  });

  it("switches view to workflow pointing to the new copy (launched=false)", () => {
    const original = makeCampaign({ id: "cmp_orig", name: "Orig" });
    const state: AppState = { ...initialState, campaigns: [original] };
    const next = appReducer(state, { type: "campaign_duplicated", id: "cmp_orig" });
    if (next.view.kind !== "workflow") throw new Error("unreachable");
    expect(next.view.launched).toBe(false);
    expect(next.view.campaign.name).toBe("Копия — Orig");
    expect(next.view.campaign.id).toBe(next.campaigns[1].id);
  });

  it("is a no-op when the id is unknown", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [makeCampaign({ id: "cmp_A" })],
    };
    const next = appReducer(state, { type: "campaign_duplicated", id: "cmp_missing" });
    expect(next).toBe(state);
  });
});

describe("appReducer — campaign_schedule_cancelled", () => {
  it("returns scheduled campaign to draft and clears scheduledFor", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [
        makeCampaign({
          id: "c1",
          status: "scheduled",
          scheduledFor: "2026-05-01T00:00:00.000Z",
        }),
      ],
    };
    const next = appReducer(state, {
      type: "campaign_schedule_cancelled",
      id: "c1",
    });
    expect(next.campaigns[0].status).toBe("draft");
    expect(next.campaigns[0].scheduledFor).toBeUndefined();
  });

  it("is a no-op when campaign is not in scheduled status", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [makeCampaign({ id: "c1", status: "active" })],
    };
    const next = appReducer(state, {
      type: "campaign_schedule_cancelled",
      id: "c1",
    });
    expect(next.campaigns[0].status).toBe("active");
  });

  it("is a no-op when id is unknown", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [makeCampaign({ id: "c1", status: "scheduled" })],
    };
    const next = appReducer(state, {
      type: "campaign_schedule_cancelled",
      id: "missing",
    });
    expect(next.campaigns[0].status).toBe("scheduled");
  });
});

describe("appReducer — goto_stats with campaignId", () => {
  it("stores campaignId on the section view", () => {
    const next = appReducer(initialState, {
      type: "goto_stats",
      campaignId: "cmp_X",
    });
    expect(next.view).toEqual({
      kind: "section",
      name: "Статистика",
      campaignId: "cmp_X",
    });
    expect(next.activeSection).toBe("Статистика");
  });

  it("leaves campaignId undefined when not passed", () => {
    const next = appReducer(initialState, { type: "goto_stats" });
    if (next.view.kind !== "section") throw new Error("unreachable");
    expect(next.view.campaignId).toBeUndefined();
    expect(next.view.name).toBe("Статистика");
  });
});

describe("isCampaignDone", () => {
  it("returns true when any campaign is paused", () => {
    const state: AppState = {
      ...initialState,
      campaigns: [makeCampaign({ id: "c1", status: "paused" })],
    };
    expect(isCampaignDone(state)).toBe(true);
  });

  it("returns true for active/completed as before", () => {
    expect(
      isCampaignDone({
        ...initialState,
        campaigns: [makeCampaign({ status: "active" })],
      })
    ).toBe(true);
    expect(
      isCampaignDone({
        ...initialState,
        campaigns: [makeCampaign({ status: "completed" })],
      })
    ).toBe(true);
  });

  it("returns false for draft/scheduled only", () => {
    expect(
      isCampaignDone({
        ...initialState,
        campaigns: [
          makeCampaign({ id: "c1", status: "draft" }),
          makeCampaign({ id: "c2", status: "scheduled" }),
        ],
      })
    ).toBe(false);
  });
});
