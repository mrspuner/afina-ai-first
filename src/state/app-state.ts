import { nanoid } from "nanoid";

export type SignalType =
  | "Регистрация"
  | "Первая сделка"
  | "Апсейл"
  | "Реактивация"
  | "Возврат"
  | "Удержание";

export type Signal = {
  id: string;
  type: SignalType;
  count: number;
  segments: {
    max: number;
    high: number;
    mid: number;
    low: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "completed";

export type Campaign = {
  id: string;
  name: string;
  signalId: string;
  status: CampaignStatus;
  createdAt: string;
  launchedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  scheduledFor?: string;
};

export type Preset = {
  key: "empty" | "mid" | "full";
  label: string;
  signals: Signal[];
  campaigns: Campaign[];
};

export type SectionName = "Статистика" | "Сигналы" | "Кампании";

export type View =
  | { kind: "welcome" }
  | { kind: "guided-signal"; initialScenario?: { id: string; name: string } }
  | { kind: "awaiting-campaign" }
  | { kind: "campaign-select" }
  | { kind: "workflow"; campaign: { id: string; name: string }; launched: boolean }
  | { kind: "section"; name: SectionName; campaignId?: string };

export type AppState = {
  view: View;
  signals: Signal[];
  campaigns: Campaign[];
  workflowCommand: string | null;
  workflowNodeCommand: { commands: Array<{ nodeLabel: string; text: string }> } | null;
  selectedWorkflowNode: { id: string; label: string } | null;
  aiReply: string | null;
  launchFlyoutOpen: boolean;
  activeSection: SectionName | null;
};

export type Action =
  | { type: "start_signal_flow"; initialScenario?: { id: string; name: string } }
  | { type: "signal_added"; signal: Signal }
  | { type: "signal_complete" }
  | { type: "step2_clicked" }
  | { type: "campaign_selected"; campaign: { id: string; name: string } }
  | { type: "campaign_from_signal"; signalId: string }
  | { type: "campaign_opened"; id: string }
  | { type: "campaign_renamed"; id: string; name: string }
  | { type: "campaign_saved_draft"; id: string }
  | { type: "campaign_created"; campaign: Campaign }
  | { type: "campaign_status_changed"; id: string; status: CampaignStatus; timestamp: string }
  | { type: "campaign_duplicated"; id: string }
  | { type: "campaign_schedule_cancelled"; id: string }
  | { type: "preset_applied"; preset: Preset }
  | { type: "workflow_command_submit"; text: string }
  | { type: "workflow_command_handled" }
  | { type: "workflow_node_selected"; id: string; label: string }
  | { type: "workflow_node_deselected" }
  | { type: "workflow_node_command_submit"; commands: Array<{ nodeLabel: string; text: string }> }
  | { type: "workflow_node_command_handled" }
  | { type: "ai_reply_shown"; text: string }
  | { type: "ai_reply_dismissed" }
  | { type: "goto_stats"; campaignId?: string }
  | { type: "sidebar_nav"; section: SectionName }
  | { type: "flyout_open" }
  | { type: "flyout_close" }
  | { type: "flyout_signal_select"; id: string; name: string }
  | { type: "flyout_campaign_select" };

export const initialState: AppState = {
  view: { kind: "welcome" },
  signals: [],
  campaigns: [],
  workflowCommand: null,
  workflowNodeCommand: null,
  selectedWorkflowNode: null,
  aiReply: null,
  launchFlyoutOpen: false,
  activeSection: null,
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "start_signal_flow":
      return {
        ...state,
        view: { kind: "guided-signal", initialScenario: action.initialScenario },
        launchFlyoutOpen: false,
        activeSection: null,
      };

    case "signal_added":
      return {
        ...state,
        signals: [...state.signals, action.signal],
        view: { kind: "awaiting-campaign" },
      };

    case "signal_complete":
    case "step2_clicked":
      return { ...state, view: { kind: "campaign-select" } };

    case "campaign_selected": {
      const existing = state.campaigns.find((c) => c.id === action.campaign.id);
      if (existing) {
        return {
          ...state,
          view: {
            kind: "workflow",
            campaign: action.campaign,
            launched:
              existing.status === "active" ||
              existing.status === "paused" ||
              existing.status === "completed",
          },
          activeSection: null,
        };
      }
      const latestSignal = state.signals[state.signals.length - 1];
      const newCampaign: Campaign | null = latestSignal
        ? {
            id: action.campaign.id,
            name: action.campaign.name,
            signalId: latestSignal.id,
            status: "draft",
            createdAt: new Date().toISOString(),
          }
        : null;
      return {
        ...state,
        campaigns: newCampaign
          ? [...state.campaigns, newCampaign]
          : state.campaigns,
        view: { kind: "workflow", campaign: action.campaign, launched: false },
        activeSection: null,
      };
    }

    case "campaign_from_signal": {
      const signal = state.signals.find((s) => s.id === action.signalId);
      if (!signal) return state;
      const n =
        state.campaigns.filter((c) => c.signalId === signal.id).length + 1;
      const newCampaign: Campaign = {
        id: `cmp_${nanoid(6)}`,
        name: `${signal.type} #${n}`,
        signalId: signal.id,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        campaigns: [...state.campaigns, newCampaign],
        view: {
          kind: "workflow",
          campaign: { id: newCampaign.id, name: newCampaign.name },
          launched: false,
        },
        activeSection: null,
      };
    }

    case "campaign_opened": {
      const c = state.campaigns.find((cc) => cc.id === action.id);
      if (!c) return state;
      return {
        ...state,
        view: {
          kind: "workflow",
          campaign: { id: c.id, name: c.name },
          launched:
            c.status === "active" ||
            c.status === "paused" ||
            c.status === "completed",
        },
        activeSection: null,
      };
    }

    case "campaign_renamed": {
      const name = action.name.trim();
      if (!name) return state;
      if (!state.campaigns.some((c) => c.id === action.id)) return state;
      return {
        ...state,
        campaigns: state.campaigns.map((c) =>
          c.id === action.id ? { ...c, name } : c
        ),
        view:
          state.view.kind === "workflow" && state.view.campaign.id === action.id
            ? { ...state.view, campaign: { ...state.view.campaign, name } }
            : state.view,
      };
    }

    case "campaign_saved_draft":
      return state;

    case "campaign_created":
      return {
        ...state,
        campaigns: [...state.campaigns, action.campaign],
        view:
          state.view.kind === "workflow" &&
          state.view.campaign.id === action.campaign.id &&
          action.campaign.status === "active"
            ? { ...state.view, launched: true }
            : state.view,
      };

    case "campaign_status_changed":
      return {
        ...state,
        campaigns: state.campaigns.map((c) => {
          if (c.id !== action.id) return c;
          const next: Campaign = { ...c, status: action.status };
          if (action.status === "active") {
            // transition from paused → active clears pausedAt but must NOT
            // overwrite launchedAt. Fresh launch (from draft) sets launchedAt.
            next.pausedAt = undefined;
            if (!c.launchedAt) next.launchedAt = action.timestamp;
          }
          if (action.status === "paused") {
            next.pausedAt = action.timestamp ?? new Date().toISOString();
          }
          if (action.status === "completed") next.completedAt = action.timestamp;
          if (action.status === "scheduled") next.scheduledFor = action.timestamp;
          return next;
        }),
        view:
          state.view.kind === "workflow" && state.view.campaign.id === action.id && action.status === "active"
            ? { ...state.view, launched: true }
            : state.view,
      };

    case "campaign_duplicated": {
      const original = state.campaigns.find((c) => c.id === action.id);
      if (!original) return state;
      const dup: Campaign = {
        id: `cmp_${nanoid(6)}`,
        name: `Копия — ${original.name}`,
        signalId: original.signalId,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        campaigns: [...state.campaigns, dup],
        view: {
          kind: "workflow",
          campaign: { id: dup.id, name: dup.name },
          launched: false,
        },
        activeSection: null,
      };
    }

    case "campaign_schedule_cancelled":
      return {
        ...state,
        campaigns: state.campaigns.map((c) => {
          if (c.id !== action.id) return c;
          if (c.status !== "scheduled") return c;
          const next: Campaign = { ...c, status: "draft" };
          delete next.scheduledFor;
          return next;
        }),
      };

    case "preset_applied": {
      const workflowCampaignId =
        state.view.kind === "workflow" ? state.view.campaign.id : null;
      const keepWorkflow =
        workflowCampaignId !== null &&
        action.preset.campaigns.some((c) => c.id === workflowCampaignId);
      return {
        ...state,
        signals: action.preset.signals,
        campaigns: action.preset.campaigns,
        view:
          state.view.kind === "workflow" && !keepWorkflow
            ? { kind: "section", name: "Кампании" }
            : state.view,
        activeSection:
          state.view.kind === "workflow" && !keepWorkflow ? "Кампании" : state.activeSection,
      };
    }

    case "workflow_command_submit":
      return { ...state, workflowCommand: action.text };

    case "workflow_command_handled":
      return { ...state, workflowCommand: null };

    case "workflow_node_selected":
      return {
        ...state,
        selectedWorkflowNode: { id: action.id, label: action.label },
      };

    case "workflow_node_deselected":
      return { ...state, selectedWorkflowNode: null };

    case "workflow_node_command_submit":
      return {
        ...state,
        workflowNodeCommand: { commands: action.commands },
        selectedWorkflowNode: null,
      };

    case "workflow_node_command_handled":
      return { ...state, workflowNodeCommand: null };

    case "ai_reply_shown":
      return { ...state, aiReply: action.text };

    case "ai_reply_dismissed":
      return { ...state, aiReply: null };

    case "goto_stats":
      return {
        ...state,
        view: { kind: "section", name: "Статистика", campaignId: action.campaignId },
        workflowCommand: null,
        activeSection: "Статистика",
      };

    case "sidebar_nav":
      return {
        ...state,
        view: { kind: "section", name: action.section },
        workflowCommand: null,
        activeSection: action.section,
      };

    case "flyout_open":
      return { ...state, launchFlyoutOpen: true };

    case "flyout_close":
      return { ...state, launchFlyoutOpen: false };

    case "flyout_signal_select":
      return {
        ...state,
        view: {
          kind: "guided-signal",
          initialScenario: { id: action.id, name: action.name },
        },
        launchFlyoutOpen: false,
        activeSection: null,
      };

    case "flyout_campaign_select": {
      const hasSignal = state.signals.length > 0;
      return {
        ...state,
        launchFlyoutOpen: false,
        view: hasSignal ? { kind: "campaign-select" } : { kind: "section", name: "Сигналы" },
        activeSection: hasSignal ? null : "Сигналы",
      };
    }
  }
}

export const isSignalDone = (s: AppState) => s.signals.length > 0;
export const isCampaignDone = (s: AppState) =>
  s.campaigns.some(
    (c) =>
      c.status === "active" ||
      c.status === "paused" ||
      c.status === "completed"
  );
export const isStep1Active = (s: AppState) => !isSignalDone(s);
export const isStep2Active = (s: AppState) => isSignalDone(s) && !isCampaignDone(s);
export const isStep3Active = (s: AppState) => isCampaignDone(s);
export const isWorkflowView = (s: AppState) => s.view.kind === "workflow";
export const isOnWelcome = (s: AppState) => s.view.kind === "welcome";
