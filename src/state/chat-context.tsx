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

export type ChatPanelMode = "collapsed" | "sidebar";

export interface ChatState {
  messages: ChatMessage[];
  mode: ChatPanelMode;
}

export type ChatAction =
  | { type: "append"; message: ChatMessage }
  | { type: "update_pending"; id: string; text: string }
  | { type: "clear" }
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
    case "open_sidebar": {
      return state.mode === "sidebar" ? state : { ...state, mode: "sidebar" };
    }
    case "close_sidebar": {
      return state.mode === "collapsed" ? state : { ...state, mode: "collapsed" };
    }
  }
}

export const INITIAL_CHAT_STATE: ChatState = {
  messages: [],
  mode: "collapsed",
};

let messageCounter = 0;
export function nextMessageId(): string {
  messageCounter += 1;
  return `msg_${messageCounter}`;
}

// ---------------------------------------------------------------------------
// ChatProvider + useChat
// ---------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { useAppState } from "./app-state-context";

interface ChatContextValue {
  messages: ChatMessage[];
  mode: ChatPanelMode;
  /** Returns the id of the new message so the caller can update_pending later. */
  append: (input: Omit<ChatMessage, "id" | "createdAt">) => string;
  updatePending: (id: string, text: string) => void;
  clear: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, INITIAL_CHAT_STATE);
  const { wizardSessionId, signals, resumingSignalId } = useAppState();

  // Reset the chat when the wizard session id changes (new signal flow started).
  useEffect(() => {
    dispatch({ type: "clear" });
  }, [wizardSessionId]);

  // Resume-then-launch path: when the actively-resumed signal leaves draft
  // status, clear history. Skipped when no signal is resumed (the
  // wizardSessionId effect already covers fresh-start / restart paths).
  const resumedSignal = useMemo(
    () => (resumingSignalId ? signals.find((s) => s.id === resumingSignalId) ?? null : null),
    [resumingSignalId, signals]
  );
  const resumedStatus = resumedSignal?.status;
  useEffect(() => {
    if (resumedStatus && resumedStatus !== "draft") {
      dispatch({ type: "clear" });
    }
  }, [resumedStatus]);

  const append = useCallback(
    (input: Omit<ChatMessage, "id" | "createdAt">) => {
      const message: ChatMessage = {
        ...input,
        id: nextMessageId(),
        createdAt: Date.now(),
      };
      dispatch({ type: "append", message });
      return message.id;
    },
    []
  );

  const updatePending = useCallback((id: string, text: string) => {
    dispatch({ type: "update_pending", id, text });
  }, []);

  const clear = useCallback(() => dispatch({ type: "clear" }), []);
  const openSidebar = useCallback(() => dispatch({ type: "open_sidebar" }), []);
  const closeSidebar = useCallback(() => dispatch({ type: "close_sidebar" }), []);

  const value = useMemo<ChatContextValue>(
    () => ({
      messages: state.messages,
      mode: state.mode,
      append,
      updatePending,
      clear,
      openSidebar,
      closeSidebar,
    }),
    [state.messages, state.mode, append, updatePending, clear, openSidebar, closeSidebar]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}
