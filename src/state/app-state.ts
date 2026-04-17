export type SignalFact = {
  scenarioId: string;
  createdAt: string;
  count: number;
};

export type CampaignFact = {
  typeName: string;
  launchedAt: string;
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
  signal: SignalFact | null;
  launchedCampaign: CampaignFact | null;
  workflowCommand: string | null;
  launchFlyoutOpen: boolean;
  activeSection: SectionName | null;
};

export type Action =
  | { type: "start_signal_flow"; initialScenario?: { id: string; name: string } }
  | { type: "signal_step8_reached"; scenarioId: string }
  | { type: "signal_complete" }
  | { type: "step2_clicked" }
  | { type: "campaign_selected"; campaign: { id: string; name: string } }
  | { type: "campaign_launched"; typeName: string; launchedAt: string }
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
  signal: null,
  launchedCampaign: null,
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

    case "signal_step8_reached": {
      const createdAt = new Date().toLocaleDateString("ru-RU");
      return {
        ...state,
        signal: { scenarioId: action.scenarioId, createdAt, count: 4312 },
        view: { kind: "awaiting-campaign" },
      };
    }

    case "signal_complete":
    case "step2_clicked":
      return { ...state, view: { kind: "campaign-select" } };

    case "campaign_selected":
      return {
        ...state,
        view: { kind: "workflow", campaign: action.campaign, launched: false },
        activeSection: null,
      };

    case "campaign_launched": {
      const fact = { typeName: action.typeName, launchedAt: action.launchedAt };
      return {
        ...state,
        launchedCampaign: fact,
        view:
          state.view.kind === "workflow"
            ? { ...state.view, launched: true }
            : state.view,
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

    case "flyout_campaign_select":
      return {
        ...state,
        launchFlyoutOpen: false,
        view: state.signal
          ? { kind: "campaign-select" }
          : { kind: "section", name: "Сигналы" },
        activeSection: state.signal ? null : "Сигналы",
      };
  }
}

export const isSignalDone = (s: AppState) => s.signal !== null;
export const isCampaignDone = (s: AppState) => s.launchedCampaign !== null;
export const isStep1Active = (s: AppState) => !isSignalDone(s);
export const isStep2Active = (s: AppState) =>
  isSignalDone(s) && !isCampaignDone(s);
export const isStep3Active = (s: AppState) => isCampaignDone(s);
export const isWorkflowView = (s: AppState) => s.view.kind === "workflow";
export const isOnWelcome = (s: AppState) => s.view.kind === "welcome";
