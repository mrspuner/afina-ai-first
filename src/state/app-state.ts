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

export type CampaignStatus = "draft" | "scheduled" | "active" | "completed";

export type Campaign = {
  id: string;
  name: string;
  signalId: string;
  status: CampaignStatus;
  createdAt: string;
  launchedAt?: string;
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
  | { kind: "section"; name: SectionName };

export type AppState = {
  view: View;
  signals: Signal[];
  campaigns: Campaign[];
  workflowCommand: string | null;
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
  | { type: "campaign_created"; campaign: Campaign }
  | { type: "campaign_status_changed"; id: string; status: CampaignStatus; timestamp: string }
  | { type: "preset_applied"; preset: Preset }
  | { type: "workflow_command_submit"; text: string }
  | { type: "workflow_command_handled" }
  | { type: "goto_stats" }
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

    case "campaign_selected":
      return {
        ...state,
        view: { kind: "workflow", campaign: action.campaign, launched: false },
        activeSection: null,
      };

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
          launched: c.status === "active" || c.status === "completed",
        },
        activeSection: null,
      };
    }

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
          if (action.status === "active") next.launchedAt = action.timestamp;
          if (action.status === "completed") next.completedAt = action.timestamp;
          if (action.status === "scheduled") next.scheduledFor = action.timestamp;
          return next;
        }),
        view:
          state.view.kind === "workflow" && state.view.campaign.id === action.id && action.status === "active"
            ? { ...state.view, launched: true }
            : state.view,
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

    case "goto_stats":
      return {
        ...state,
        view: { kind: "section", name: "Статистика" },
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
  s.campaigns.some((c) => c.status === "active" || c.status === "completed");
export const isStep1Active = (s: AppState) => !isSignalDone(s);
export const isStep2Active = (s: AppState) => isSignalDone(s) && !isCampaignDone(s);
export const isStep3Active = (s: AppState) => isCampaignDone(s);
export const isWorkflowView = (s: AppState) => s.view.kind === "workflow";
export const isOnWelcome = (s: AppState) => s.view.kind === "welcome";
