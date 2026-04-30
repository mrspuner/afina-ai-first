import { nanoid } from "nanoid";
import type { StructuralOp } from "./structural-commands";
import type { CampaignSort } from "./parse-campaign-filter";
import type { Survey, SurveyStatus } from "@/types/survey";
import { EMPTY_SURVEY } from "@/types/survey";
import type { SignalStatus } from "@/types/signal-status";
import type { StepData } from "@/types/campaign";
import {
  DEFAULT_DIRECTION_ID,
  businessDirectionFromSurvey,
} from "@/data/business-directions";

export type SignalType =
  | "Регистрация"
  | "Первая сделка"
  | "Апсейл"
  | "Реактивация"
  | "Возврат"
  | "Удержание";

export const SIGNAL_TYPES = [
  "Регистрация",
  "Первая сделка",
  "Апсейл",
  "Реактивация",
  "Возврат",
  "Удержание",
] as const satisfies readonly SignalType[];

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
  isCustom?: boolean;
  // Owned by feature/signal-flow worktree (E). Defaults to "ready" when
  // omitted — preserves behaviour of existing presets that don't set status.
  status?: SignalStatus;
  /**
   * Snapshot of the wizard form at the moment this signal was launched.
   * Lets `Открыть и редактировать` re-hydrate the wizard at step-6 with
   * every field intact. Optional — older signals or seeded presets won't
   * carry it.
   */
  wizardData?: StepData;
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

// A "browser-history address" — what we persist to history.state so back/forward
// can restore a section. Intentionally coarser than View: no launched flag, no
// selectedWorkflowNode, no in-flight commands. On popstate we rehydrate the
// full View from this address + current campaigns[].
export type ViewAddress =
  | { kind: "welcome" }
  | { kind: "guided-signal"; scenarioId?: string; scenarioName?: string }
  | { kind: "awaiting-campaign" }
  | { kind: "campaign-select" }
  | { kind: "workflow"; campaignId: string }
  | { kind: "section"; name: SectionName; campaignId?: string };

export type AppState = {
  view: View;
  signals: Signal[];
  campaigns: Campaign[];
  workflowCommand: string | null;
  workflowNodeCommand: { commands: Array<{ nodeLabel: string; text: string }> } | null;
  workflowStructuralCommands: { ops: StructuralOp[] } | null;
  selectedWorkflowNode: { id: string; label: string } | null;
  aiReply: string | null;
  launchFlyoutOpen: boolean;
  activeSection: SectionName | null;
  campaignFilter: CampaignStatus[];
  campaignSort: CampaignSort;
  clientDirection: string;
  // ----- shared state slices added by data-foundations -----
  // Owned by feature/anketa worktree (B):
  survey: Survey;
  surveyStatus: SurveyStatus;
  // Owned by feature/signal-flow worktree (E):
  balance: number;
  notifications: { signalsBadge: boolean };
  /**
   * Set when the user picks "Открыть и редактировать" on an awaiting-payment
   * signal. The wizard reads this on mount, hydrates step-6 from the
   * signal's `wizardData`, and clears the field. Only one signal can be
   * "resumed" at a time — entering the wizard from any other path clears it.
   */
  resumingSignalId?: string;
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
  | { type: "campaigns_query_set"; statuses: CampaignStatus[]; sort: CampaignSort }
  | { type: "campaigns_filter_remove"; status: CampaignStatus }
  | { type: "campaigns_filter_clear" }
  | { type: "preset_applied"; preset: Preset }
  | { type: "workflow_command_submit"; text: string }
  | { type: "workflow_command_handled" }
  | { type: "workflow_node_selected"; id: string; label: string }
  | { type: "workflow_node_deselected" }
  | { type: "workflow_node_command_submit"; commands: Array<{ nodeLabel: string; text: string }> }
  | { type: "workflow_node_command_handled" }
  | { type: "workflow_structural_commands_submit"; ops: StructuralOp[] }
  | { type: "workflow_structural_commands_handled" }
  | { type: "ai_reply_shown"; text: string }
  | { type: "ai_reply_dismissed" }
  | { type: "goto_stats"; campaignId?: string }
  | { type: "sidebar_nav"; section: SectionName }
  | { type: "flyout_open" }
  | { type: "flyout_close" }
  | { type: "flyout_signal_select"; id: string; name: string }
  | { type: "flyout_campaign_select" }
  | { type: "go_welcome" }
  | { type: "restore_address"; address: ViewAddress }
  | { type: "client_direction_set"; direction: string }
  | { type: "survey_updated"; patch: Partial<Survey> }
  | { type: "survey_completed"; survey: Survey }
  | { type: "survey_skipped" }
  | { type: "survey_reset" }
  | { type: "dev_survey_force_complete" }
  | { type: "balance_topup"; amount: number }
  | { type: "signal_status_changed"; id: string; status: SignalStatus }
  | { type: "signal_deleted"; id: string }
  | { type: "signals_badge_set"; value: boolean }
  | { type: "resume_signal_in_wizard"; signalId: string }
  | { type: "resume_signal_in_wizard_handled" };
// PARALLEL-WORKTREE INSERTION POINT — survey actions (B), billing/signal-status actions (E).
// Each worktree appends its own action variants to the union above; resolve merges by
// keeping every appended line and adding the matching reducer case at the end of appReducer.

export const initialState: AppState = {
  view: { kind: "welcome" },
  signals: [],
  campaigns: [],
  workflowCommand: null,
  workflowNodeCommand: null,
  workflowStructuralCommands: null,
  selectedWorkflowNode: null,
  aiReply: null,
  launchFlyoutOpen: false,
  activeSection: null,
  campaignFilter: [],
  campaignSort: "default",
  clientDirection: "finance",
  survey: EMPTY_SURVEY,
  surveyStatus: "not_started",
  balance: 0,
  notifications: { signalsBadge: false },
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "start_signal_flow":
      return {
        ...state,
        view: { kind: "guided-signal", initialScenario: action.initialScenario },
        launchFlyoutOpen: false,
        activeSection: null,
        resumingSignalId: undefined,
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
          campaignFilter: [],
          campaignSort: "default",
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
        campaignFilter: [],
        campaignSort: "default",
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
        campaignFilter: [],
        campaignSort: "default",
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
        campaignFilter: [],
        campaignSort: "default",
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
        campaignFilter: [],
        campaignSort: "default",
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

    case "campaigns_query_set": {
      const seen = new Set<CampaignStatus>();
      const dedup: CampaignStatus[] = [];
      for (const s of action.statuses) {
        if (!seen.has(s)) {
          seen.add(s);
          dedup.push(s);
        }
      }
      return { ...state, campaignFilter: dedup, campaignSort: action.sort };
    }

    case "campaigns_filter_remove":
      return {
        ...state,
        campaignFilter: state.campaignFilter.filter((s) => s !== action.status),
      };

    case "campaigns_filter_clear":
      return { ...state, campaignFilter: [], campaignSort: "default" };

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

    case "workflow_structural_commands_submit":
      return {
        ...state,
        workflowStructuralCommands: { ops: action.ops },
        selectedWorkflowNode: null,
      };

    case "workflow_structural_commands_handled":
      return { ...state, workflowStructuralCommands: null };

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
        campaignFilter: [],
        campaignSort: "default",
      };

    case "sidebar_nav":
      return {
        ...state,
        view: { kind: "section", name: action.section },
        workflowCommand: null,
        activeSection: action.section,
        campaignFilter: [],
        campaignSort: "default",
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
        resumingSignalId: undefined,
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

    case "go_welcome":
      return {
        ...state,
        view: { kind: "welcome" },
        activeSection: null,
        launchFlyoutOpen: false,
        selectedWorkflowNode: null,
        workflowCommand: null,
        workflowNodeCommand: null,
        workflowStructuralCommands: null,
        aiReply: null,
        campaignFilter: [],
        campaignSort: "default",
      };

    case "restore_address": {
      const addr = action.address;
      const rebuilt = rebuildViewFromAddress(addr, state.campaigns);
      return {
        ...state,
        view: rebuilt,
        activeSection: addr.kind === "section" ? addr.name : null,
        launchFlyoutOpen: false,
        selectedWorkflowNode: null,
        workflowCommand: null,
        workflowNodeCommand: null,
        workflowStructuralCommands: null,
        aiReply: null,
        campaignFilter: [],
        campaignSort: "default",
      };
    }

    case "client_direction_set":
      return { ...state, clientDirection: action.direction };

    case "survey_updated":
      return { ...state, survey: { ...state.survey, ...action.patch } };

    case "survey_completed":
      return {
        ...state,
        survey: action.survey,
        surveyStatus: "completed",
        // Анкета — единственный источник «направления клиента» для пользователя.
        // Дев-панель просто отражает это значение и позволяет тестово переопределить.
        clientDirection: businessDirectionFromSurvey(action.survey.directionId),
      };

    case "survey_skipped":
      return { ...state, surveyStatus: "skipped" };

    case "survey_reset":
      return {
        ...state,
        survey: EMPTY_SURVEY,
        surveyStatus: "not_started",
        clientDirection: DEFAULT_DIRECTION_ID,
      };

    case "dev_survey_force_complete":
      // Dev-panel-only override: lets a tester bypass the survey gate without
      // filling the form. Keeps existing survey data and clientDirection so the
      // dev can pick direction independently from the panel.
      return { ...state, surveyStatus: "completed" };

    case "balance_topup":
      return { ...state, balance: state.balance + Math.max(0, action.amount) };

    case "signal_status_changed": {
      const exists = state.signals.some((s) => s.id === action.id);
      if (!exists) return state;
      return {
        ...state,
        signals: state.signals.map((s) =>
          s.id === action.id
            ? { ...s, status: action.status, updatedAt: new Date().toISOString() }
            : s
        ),
        notifications:
          action.status === "ready" || action.status === "error" || action.status === "expired"
            ? { ...state.notifications, signalsBadge: true }
            : state.notifications,
      };
    }

    case "signal_deleted":
      return {
        ...state,
        signals: state.signals.filter((s) => s.id !== action.id),
      };

    case "signals_badge_set":
      return {
        ...state,
        notifications: { ...state.notifications, signalsBadge: action.value },
      };

    case "resume_signal_in_wizard":
      return {
        ...state,
        view: { kind: "guided-signal" },
        resumingSignalId: action.signalId,
        launchFlyoutOpen: false,
        activeSection: null,
      };

    case "resume_signal_in_wizard_handled":
      return {
        ...state,
        resumingSignalId: undefined,
      };
    // PARALLEL-WORTREE INSERTION POINT — append survey/billing/signal-status cases
    // immediately above this comment to keep merges trivial.
  }
}

function rebuildViewFromAddress(addr: ViewAddress, campaigns: Campaign[]): View {
  switch (addr.kind) {
    case "welcome":
      return { kind: "welcome" };
    case "guided-signal":
      return {
        kind: "guided-signal",
        initialScenario:
          addr.scenarioId && addr.scenarioName
            ? { id: addr.scenarioId, name: addr.scenarioName }
            : undefined,
      };
    case "awaiting-campaign":
      return { kind: "awaiting-campaign" };
    case "campaign-select":
      return { kind: "campaign-select" };
    case "workflow": {
      const c = campaigns.find((cc) => cc.id === addr.campaignId);
      // If the campaign no longer exists, fall back to campaign list rather than
      // rendering an empty workflow.
      if (!c) return { kind: "section", name: "Кампании" };
      return {
        kind: "workflow",
        campaign: { id: c.id, name: c.name },
        launched:
          c.status === "active" ||
          c.status === "paused" ||
          c.status === "completed",
      };
    }
    case "section":
      return { kind: "section", name: addr.name, campaignId: addr.campaignId };
  }
}

export function viewToAddress(view: View): ViewAddress {
  switch (view.kind) {
    case "welcome":
      return { kind: "welcome" };
    case "guided-signal":
      return {
        kind: "guided-signal",
        scenarioId: view.initialScenario?.id,
        scenarioName: view.initialScenario?.name,
      };
    case "awaiting-campaign":
      return { kind: "awaiting-campaign" };
    case "campaign-select":
      return { kind: "campaign-select" };
    case "workflow":
      return { kind: "workflow", campaignId: view.campaign.id };
    case "section":
      return { kind: "section", name: view.name, campaignId: view.campaignId };
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
