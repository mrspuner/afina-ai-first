"use client";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  /** When set, the user bubble renders a chip with this label before the text. */
  triggerLabel?: string;
  /** Placeholder while the simulated AI tick runs. Replaced by update_pending. */
  pending?: boolean;
  createdAt: number;
}

export type ChatPanelMode = "collapsed" | "expanded" | "sidebar";
export type ChatBarMode = "collapsed" | "expanded";

export interface ChatState {
  messages: ChatMessage[];
  mode: ChatPanelMode;
  previousBarMode: ChatBarMode;
}

export type ChatAction =
  | { type: "append"; message: ChatMessage }
  | { type: "update_pending"; id: string; text: string }
  | { type: "clear" }
  | { type: "set_mode"; mode: ChatBarMode }
  | { type: "open_sidebar" }
  | { type: "close_sidebar" };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "append": {
      return { ...state, messages: [...state.messages, action.message] };
    }
    case "update_pending": {
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, text: action.text, pending: undefined } : m
        ),
      };
    }
    case "clear": {
      return { ...state, messages: [] };
    }
    case "set_mode": {
      return { ...state, mode: action.mode };
    }
    case "open_sidebar": {
      if (state.mode === "sidebar") return state;
      return {
        ...state,
        mode: "sidebar",
        previousBarMode: state.mode === "expanded" ? "expanded" : "collapsed",
      };
    }
    case "close_sidebar": {
      if (state.mode !== "sidebar") return state;
      return { ...state, mode: state.previousBarMode };
    }
  }
}

export const INITIAL_CHAT_STATE: ChatState = {
  messages: [],
  mode: "collapsed",
  previousBarMode: "collapsed",
};

let messageCounter = 0;
export function nextMessageId(): string {
  messageCounter += 1;
  return `msg_${messageCounter}`;
}
